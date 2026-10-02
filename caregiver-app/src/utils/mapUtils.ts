export interface MapLocationData {
  latitude?: number;
  longitude?: number;
  addressLine1?: string;
  locality?: string;
  city?: string;
  postalCode?: string;
}

/**
 * Construct canonical Google Maps navigation/directions link
 * prioritizing verified GPS coordinates, with fallback to formatted street address.
 */
export function getGoogleMapsNavigationUrl(loc?: MapLocationData | null): string {
  if (!loc) {
    return 'https://www.google.com/maps';
  }

  const lat = typeof loc.latitude === 'number' ? loc.latitude : parseFloat(String(loc.latitude));
  const lng = typeof loc.longitude === 'number' ? loc.longitude : parseFloat(String(loc.longitude));

  const hasValidCoords = !isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0);

  if (hasValidCoords) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }

  const parts = [loc.addressLine1, loc.locality, loc.city || 'Chennai', loc.postalCode].filter(Boolean);
  const query = parts.length > 0 ? parts.join(', ') : 'Adyar, Chennai, Tamil Nadu';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
