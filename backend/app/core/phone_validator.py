import re
from typing import Optional
from fastapi import HTTPException, status

COUNTRY_RULES = {
    "+91": {"name": "India", "min_len": 10, "max_len": 10, "digits_regex": r"^\d{10}$", "message": "Please enter a valid 10-digit Indian mobile number."},
    "+1": {"name": "USA/Canada", "min_len": 10, "max_len": 10, "digits_regex": r"^\d{10}$", "message": "Please enter a valid 10-digit mobile number for USA/Canada."},
    "+44": {"name": "United Kingdom", "min_len": 10, "max_len": 11, "digits_regex": r"^\d{10,11}$", "message": "Please enter a valid UK phone number (10-11 digits)."},
    "+65": {"name": "Singapore", "min_len": 8, "max_len": 8, "digits_regex": r"^\d{8}$", "message": "Please enter a valid 8-digit Singapore phone number."},
    "+971": {"name": "UAE", "min_len": 9, "max_len": 9, "digits_regex": r"^\d{9}$", "message": "Please enter a valid 9-digit UAE phone number."},
    "+60": {"name": "Malaysia", "min_len": 9, "max_len": 10, "digits_regex": r"^\d{9,10}$", "message": "Please enter a valid Malaysian phone number."},
    "+94": {"name": "Sri Lanka", "min_len": 9, "max_len": 9, "digits_regex": r"^\d{9}$", "message": "Please enter a valid 9-digit Sri Lankan phone number."},
    "+64": {"name": "New Zealand", "min_len": 8, "max_len": 10, "digits_regex": r"^\d{8,10}$", "message": "Please enter a valid New Zealand phone number."},
    "+966": {"name": "Saudi Arabia", "min_len": 9, "max_len": 9, "digits_regex": r"^\d{9}$", "message": "Please enter a valid 9-digit Saudi phone number."},
}


def validate_and_normalize_phone(phone: str, country_code: Optional[str] = None) -> str:
    """
    Validate and normalize phone numbers with strict country-specific digit rules.
    Prevents bypassing frontend validation via direct API requests.
    """
    if not phone or not isinstance(phone, str) or not phone.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number cannot be empty."
        )

    # Trim whitespace and remove standard formatting separators (spaces, hyphens)
    clean_phone = re.sub(r"[\s\-]", "", phone.strip())
    if not clean_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number cannot be empty."
        )

    # Determine country code and local digits
    matched_prefix = None
    if country_code and country_code.startswith("+"):
        matched_prefix = country_code.strip()
        # If phone already includes the country code prefix, strip it from local part
        if clean_phone.startswith(matched_prefix):
            local_digits = clean_phone[len(matched_prefix):]
        else:
            local_digits = clean_phone
    elif clean_phone.startswith("+"):
        # Match longest matching prefix from known rules
        for prefix in sorted(COUNTRY_RULES.keys(), key=len, reverse=True):
            if clean_phone.startswith(prefix):
                matched_prefix = prefix
                local_digits = clean_phone[len(prefix):].strip()
                break
        if not matched_prefix:
            # Generic E.164
            match = re.match(r"^(\+\d{1,4})(\d+)$", clean_phone)
            if match:
                matched_prefix = match.group(1)
                local_digits = match.group(2)
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid phone number format."
                )
    else:
        # Default to India (+91) if no country code provided
        matched_prefix = "+91"
        local_digits = clean_phone

    # Check for invalid characters in local digits
    if not local_digits.isdigit():
        if matched_prefix == "+91":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please enter a valid 10-digit Indian mobile number."
            )
        rule = COUNTRY_RULES.get(matched_prefix)
        msg = rule["message"] if rule else "Phone number must contain only numeric digits."
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    # Check country-specific length and pattern rules
    if matched_prefix in COUNTRY_RULES:
        rule = COUNTRY_RULES[matched_prefix]
        if not re.match(rule["digits_regex"], local_digits):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=rule["message"]
            )
    else:
        # General E.164: local digits between 6 and 14 digits
        if len(local_digits) < 6 or len(local_digits) > 14:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please enter a valid phone number with proper digit length."
            )

    return f"{matched_prefix}{local_digits}"
