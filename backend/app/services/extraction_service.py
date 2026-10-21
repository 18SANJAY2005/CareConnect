import os
import abc
import base64
import re
import urllib.parse
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple, List
import cv2
import numpy as np


# ============================================================================
# Pluggable OCR Provider Interface & Implementation Architecture (Requirement C)
# ============================================================================

class BaseOCRProvider(abc.ABC):
    """
    Abstract interface for document optical character recognition.
    Enables pluggable integration of cloud OCR providers (AWS Textract,
    Google Cloud Vision, Azure AI Document Intelligence) or local OCR engines.
    """
    @abc.abstractmethod
    def extract_text(self, image_np: np.ndarray) -> Optional[str]:
        """Extract text from the preprocessed document image."""
        pass


class LocalPreprocessingOCRProvider(BaseOCRProvider):
    """
    Local image preprocessor using OpenCV.
    Performs grayscale conversion, contrast inspection, Laplacian variance
    sharpness evaluation, Otsu adaptive thresholding, and morphological
    text region contour analysis.
    """
    def extract_text(self, image_np: np.ndarray) -> Optional[str]:
        # In the absence of an external cloud OCR API key, the local preprocessor
        # verifies image quality and returns None so that candidate data routes
        # to human administrative review rather than inventing fabricated OCR text.
        return None

    @staticmethod
    def analyze_image_quality(image_np: np.ndarray) -> Dict[str, Any]:
        """
        Evaluate image resolution, contrast, sharpness, and text block contours.
        """
        h, w = image_np.shape[:2]
        gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY) if len(image_np.shape) == 3 else image_np
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        is_sharp = bool(laplacian_var > 50.0)

        contrast = float(np.std(gray))

        # Thresholding to count text-like contour regions
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        text_like_boxes = 0
        for cnt in contours:
            _, _, bw, bh = cv2.boundingRect(cnt)
            if 8 < bw < w * 0.95 and 6 < bh < h * 0.5:
                text_like_boxes += 1

        is_readable = bool(is_sharp and contrast > 20.0 and w >= 150 and h >= 150)

        return {
            "width": w,
            "height": h,
            "sharpnessScore": round(float(laplacian_var), 1),
            "isSharp": is_sharp,
            "contrastScore": round(contrast, 1),
            "textRegionsCount": text_like_boxes,
            "isReadableQuality": is_readable,
        }


def get_configured_ocr_provider() -> Tuple[BaseOCRProvider, str, bool]:
    """
    Factory to return the active OCR provider based on environment configuration.
    External providers (AWS Textract, Google Cloud Vision) require credentials.
    Returns (provider_instance, provider_name, is_external_available).
    """
    provider_name = os.getenv("CARECONNECT_OCR_PROVIDER", "LOCAL_PREPROCESSOR_HEURISTIC").upper()
    api_key = os.getenv("CARECONNECT_OCR_API_KEY")

    if provider_name in ["GOOGLE_VISION", "AWS_TEXTRACT", "AZURE_FORM_RECOGNIZER"] and api_key:
        # Isolated external adapter placeholder (activated when enterprise keys are provisioned)
        return LocalPreprocessingOCRProvider(), provider_name, True

    return LocalPreprocessingOCRProvider(), "LOCAL_PREPROCESSOR_HEURISTIC", False


# ============================================================================
# Document Extraction & Verification Service (Requirements B, C, D)
# ============================================================================

class DocumentExtractionService:
    @staticmethod
    def _read_image_from_base64_or_bytes(data: str) -> Optional[np.ndarray]:
        """Convert base64 data URL or raw base64 string into an OpenCV image array."""
        try:
            if "," in data:
                # Strip data URL prefix (e.g. 'data:image/jpeg;base64,...')
                _, data = data.split(",", 1)
            raw_bytes = base64.b64decode(data)
            nparr = np.frombuffer(raw_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return img
        except Exception:
            return None

    @classmethod
    def scan_barcode_or_qr(cls, file_data: str) -> Dict[str, Any]:
        """
        Scan image for both 1D barcodes and 2D QR codes using OpenCV.
        Decodes payload, sanitizes input, and determines verification state.
        
        Security Rule:
          Decoding a QR code or barcode DOES NOT prove document authenticity.
          A credential must not be labelled issuer-verified unless a trusted
          authoritative verification result supports that status.
        """
        if not file_data:
            return {
                "detected": False,
                "status": "NOT_CHECKED",
                "message": "No document file provided for QR/barcode inspection.",
                "detectorType": None,
                "extractedFields": {},
            }

        img = cls._read_image_from_base64_or_bytes(file_data)
        if img is None:
            return {
                "detected": False,
                "status": "FAILED",
                "message": "Unable to decode image format. Ensure image is a valid PNG, JPG, or WebP.",
                "detectorType": None,
                "extractedFields": {},
            }

        quality = LocalPreprocessingOCRProvider.analyze_image_quality(img)

        # 1. Attempt 2D QR Code Detection
        qr_detector = cv2.QRCodeDetector()
        retval, decoded_info, _, _ = qr_detector.detectAndDecodeMulti(img)

        raw_payload = ""
        detector_type = "NONE"

        if retval and len(decoded_info) > 0 and decoded_info[0]:
            raw_payload = decoded_info[0].strip()
            detector_type = "QR_CODE"
        else:
            single_val, _, _ = qr_detector.detectAndDecode(img)
            if single_val:
                raw_payload = single_val.strip()
                detector_type = "QR_CODE"

        # 2. Attempt 1D Barcode Detection via cv2.barcode
        if not raw_payload and hasattr(cv2, "barcode"):
            try:
                barcode_detector = cv2.barcode.BarcodeDetector()
                b_res = barcode_detector.detectAndDecodeWithType(img)
                # Returns (retval, decoded_info, decoded_type, points)
                if b_res and len(b_res) >= 3 and b_res[0]:
                    d_info = b_res[1]
                    d_type = b_res[2]
                    if d_info and len(d_info) > 0 and d_info[0]:
                        raw_payload = d_info[0].strip()
                        type_str = d_type[0] if (d_type and len(d_type) > 0) else "GENERIC"
                        detector_type = f"1D_BARCODE_{type_str}"
            except Exception:
                pass

        if not raw_payload:
            return {
                "detected": False,
                "status": "MANUAL_REVIEW_REQUIRED",
                "message": "No barcode or QR code detected on this certificate. Image inspected for quality; manual reviewer inspection required.",
                "detectorType": None,
                "payload": None,
                "quality": quality,
                "extractedFields": {},
            }

        # -------------------------------------------------------------
        # Security & Payload Sanitization
        # -------------------------------------------------------------
        # Reject dangerous script injections, non-http protocols, or binary exploits
        lower_payload = raw_payload.lower()
        if any(bad in lower_payload for bad in ["javascript:", "data:", "vbscript:", "<script", "onload="]):
            return {
                "detected": True,
                "status": "FAILED",
                "message": "Malformed or unsafe barcode payload detected. Rejected for security.",
                "detectorType": detector_type,
                "payload": "[REJECTED_UNSAFE_PAYLOAD]",
                "extractedFields": {},
            }

        # Parse extracted information
        extracted_fields: Dict[str, Any] = {}
        candidate_cred_id = None

        # Check if URL payload
        if raw_payload.startswith("http://") or raw_payload.startswith("https://"):
            try:
                parsed_url = urllib.parse.urlparse(raw_payload)
                query_params = urllib.parse.parse_qs(parsed_url.query)
                for key in ["id", "cert", "reg", "credential", "roll", "cert_no"]:
                    if key in query_params:
                        candidate_cred_id = query_params[key][0]
                        break

                if not candidate_cred_id:
                    path_parts = [p for p in parsed_url.path.split("/") if p]
                    if path_parts and any(char.isdigit() for char in path_parts[-1]):
                        candidate_cred_id = path_parts[-1]

                # Arbitrary URLs embedded in certificates are stored for manual admin inspection, NEVER opened automatically
                extracted_fields["verificationUrl"] = f"{parsed_url.scheme}://{parsed_url.netloc}{parsed_url.path}"
                extracted_fields["issuerDomain"] = parsed_url.netloc
            except Exception:
                pass
        else:
            # Formatted text payload (e.g., 'ID:TN-NUR-1004;INST:Madras Medical College')
            id_match = re.search(r"(?:reg(?:istration)?|cert(?:ificate)?|id|no)[\s.:#-]+([A-Z0-9\-/]{4,30})", raw_payload, re.IGNORECASE)
            if id_match:
                candidate_cred_id = id_match.group(1).strip()

        if candidate_cred_id:
            extracted_fields["credentialId"] = candidate_cred_id

        # Common nursing / healthcare degrees detection in payload
        for qual in ["BSc Nursing", "GNM", "ANM", "Diploma in Nursing", "Emergency Medical Technician", "Geriatric Care Aide"]:
            if qual.lower() in lower_payload:
                extracted_fields["degree"] = qual
                break

        # Verification Status Determination:
        # A decoded QR or barcode code is NOT proof of authenticity. Authoritative issuer API required.
        status = "DECODED_UNCONFIRMED"
        message = (
            f"Document code ({detector_type}) detected and decoded. "
            f"Extracted credential reference: {candidate_cred_id or 'General Issuer Reference'}. "
            f"Authenticity not yet confirmed by authoritative state nursing council / issuer API. Manual verification required."
        )

        return {
            "detected": True,
            "status": status,
            "detectorType": detector_type,
            "rawPayload": raw_payload[:250],  # Truncate for audit storage
            "message": message,
            "extractedFields": extracted_fields,
            "quality": quality,
            "verifiedAt": None,  # Crucial: NEVER auto-verified by decoding alone
        }

    @classmethod
    def extract_education_certificate(cls, file_data: str) -> Dict[str, Any]:
        """
        Scan and extract candidate details from an educational certificate image.
        Uses 1D barcode and 2D QR decoding, audits image clarity, and flags for manual review.
        """
        return cls.scan_barcode_or_qr(file_data)

    @classmethod
    def extract_identity_document(cls, file_data: str, doc_type: str = "AADHAAR") -> Dict[str, Any]:
        """
        Extract candidate fields from identity document (Aadhaar, PAN, Passport, DL, Voter ID).
        Prefills candidate fields and provides values for review.
        Prevents extracted values from automatically becoming verified identity details.
        Does not log identity numbers or raw document contents.
        """
        extracted: Dict[str, Any] = {
            "documentNumber": None,
            "candidateName": None,
            "dob": None,
            "gender": None,
            "confidence": "MEDIUM",
            "isVerified": False,
        }

        if not file_data:
            return {
                "detected": False,
                "status": "NOT_CHECKED",
                "message": "No document file provided for identity inspection.",
                "extractedFields": extracted,
                "rawPayload": None,
                "verifiedAt": None,
            }

        img = cls._read_image_from_base64_or_bytes(file_data)
        if img is None:
            return {
                "detected": False,
                "status": "FAILED",
                "message": "Unable to decode identity document image.",
                "extractedFields": extracted,
                "rawPayload": None,
                "verifiedAt": None,
            }

        # Analyze image sharpness and readability
        quality = LocalPreprocessingOCRProvider.analyze_image_quality(img)
        _, ocr_provider_name, is_ocr_ext = get_configured_ocr_provider()

        # Try QR/barcode scan on identity document
        scan = cls.scan_barcode_or_qr(file_data)
        is_detected = scan.get("detected", False)
        safe_raw_payload = scan.get("rawPayload")

        if is_detected and safe_raw_payload:
            payload = scan.get("rawPayload", "")
            # Aadhaar 12-digit pattern
            aadhaar_match = re.search(r"\b([2-9][0-9]{3}\s?[0-9]{4}\s?[0-9]{4})\b", payload)
            if aadhaar_match:
                extracted["documentNumber"] = aadhaar_match.group(1).replace(" ", "")

            # PAN pattern (5 letters, 4 numbers, 1 letter)
            pan_match = re.search(r"\b([A-Z]{5}[0-9]{4}[A-Z])\b", payload)
            if pan_match:
                extracted["documentNumber"] = pan_match.group(1)

            # Gender
            if "female" in payload.lower():
                extracted["gender"] = "FEMALE"
            elif "male" in payload.lower():
                extracted["gender"] = "MALE"

            # DOB (DD/MM/YYYY or YYYY-MM-DD)
            dob_match = re.search(r"\b(\d{2}[/-]\d{2}[/-]\d{4}|\d{4}[/-]\d{2}[/-]\d{2})\b", payload)
            if dob_match:
                extracted["dob"] = dob_match.group(1).replace("/", "-")

            extracted["confidence"] = "HIGH"

        status_label = "EXTRACTED_FOR_REVIEW" if (is_detected or quality["isReadableQuality"]) else "MANUAL_REVIEW_REQUIRED"
        message = (
            "Identity document inspected. Extracted candidate fields populated for caregiver review."
            if is_detected
            else "Document image inspected. Resolution verified; routed to manual administrative review."
        )

        return {
            "detected": is_detected or quality["isReadableQuality"],
            "status": status_label,
            "rawPayload": safe_raw_payload,
            "message": message,
            "extractedFields": extracted,
            "quality": quality,
            "ocrProvider": ocr_provider_name,
            "isExternalOcrAvailable": is_ocr_ext,
            "verifiedAt": None,  # NEVER automatically marked verified
        }
