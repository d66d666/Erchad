// License Key System for Offline Subscription Management

interface LicenseData {
  schoolId: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  keyId: string; // Unique identifier for this key
}

interface ParsedLicense extends LicenseData {
  isValid: boolean;
  errorMessage?: string;
}

// Secret key for encryption (في التطبيق الحقيقي، هذا يكون مخفي ومعقد أكثر)
const SECRET_KEY = 'SCHOOL_MANAGEMENT_2024_SECRET_KEY_V1';

// Simple but effective encoding/decoding functions
function encodeData(data: string): string {
  const encoded = btoa(encodeURIComponent(data));
  return encoded.split('').reverse().join('');
}

function decodeData(encoded: string): string | null {
  try {
    const reversed = encoded.split('').reverse().join('');
    return decodeURIComponent(atob(reversed));
  } catch {
    return null;
  }
}

// Generate checksum for data integrity
function generateChecksum(data: string): string {
  let hash = 0;
  const combined = data + SECRET_KEY;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).toUpperCase();
}

// Format license key in readable format (XXXX-XXXX-XXXX-XXXX)
function formatLicenseKey(encoded: string): string {
  const chunks: string[] = [];
  for (let i = 0; i < encoded.length; i += 4) {
    chunks.push(encoded.substr(i, 4));
  }
  return chunks.join('-');
}

// Remove dashes from license key
function cleanLicenseKey(key: string): string {
  return key.replace(/-/g, '').toUpperCase();
}

/**
 * Generate a license key for a school
 */
export function generateLicenseKey(
  schoolId: string,
  startDate: string,
  endDate: string
): string {
  const keyId = Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 5).toUpperCase();

  const licenseData: LicenseData = {
    schoolId,
    startDate,
    endDate,
    keyId
  };

  const dataString = JSON.stringify(licenseData);
  const checksum = generateChecksum(dataString);
  const payload = `${checksum}:${dataString}`;
  const encoded = encodeData(payload);

  return formatLicenseKey(encoded);
}

/**
 * Validate and parse a license key
 */
export function validateLicenseKey(licenseKey: string, schoolId: string): ParsedLicense {
  const cleanKey = cleanLicenseKey(licenseKey);

  // Decode the license key
  const decoded = decodeData(cleanKey);
  if (!decoded) {
    return {
      schoolId: '',
      startDate: '',
      endDate: '',
      keyId: '',
      isValid: false,
      errorMessage: 'رمز التفعيل غير صحيح'
    };
  }

  // Split checksum and data
  const parts = decoded.split(':');
  if (parts.length !== 2) {
    return {
      schoolId: '',
      startDate: '',
      endDate: '',
      keyId: '',
      isValid: false,
      errorMessage: 'تنسيق الرمز غير صحيح'
    };
  }

  const [checksum, dataString] = parts;

  // Verify checksum
  const calculatedChecksum = generateChecksum(dataString);
  if (checksum !== calculatedChecksum) {
    return {
      schoolId: '',
      startDate: '',
      endDate: '',
      keyId: '',
      isValid: false,
      errorMessage: 'رمز التفعيل تالف أو معدّل'
    };
  }

  // Parse license data
  let licenseData: LicenseData;
  try {
    licenseData = JSON.parse(dataString);
  } catch {
    return {
      schoolId: '',
      startDate: '',
      endDate: '',
      keyId: '',
      isValid: false,
      errorMessage: 'بيانات الرمز غير صحيحة'
    };
  }

  // Verify school ID matches
  if (licenseData.schoolId !== schoolId) {
    return {
      schoolId: licenseData.schoolId,
      startDate: licenseData.startDate,
      endDate: licenseData.endDate,
      keyId: licenseData.keyId,
      isValid: false,
      errorMessage: 'هذا الرمز غير مخصص لهذه المدرسة'
    };
  }

  // Check if license has expired
  const now = new Date();
  const endDate = new Date(licenseData.endDate);

  if (endDate < now) {
    return {
      ...licenseData,
      isValid: false,
      errorMessage: 'انتهت صلاحية هذا الرمز'
    };
  }

  // All checks passed
  return {
    ...licenseData,
    isValid: true
  };
}

/**
 * Check if current subscription is active
 */
export function isSubscriptionActive(endDate: string): boolean {
  if (!endDate) return false;
  const now = new Date();
  const expiry = new Date(endDate);
  return expiry >= now;
}

/**
 * Get days remaining in subscription
 */
export function getDaysRemaining(endDate: string): number {
  if (!endDate) return 0;
  const now = new Date();
  const expiry = new Date(endDate);
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Format date for display (Arabic)
 */
export function formatSubscriptionDate(dateString: string): string {
  if (!dateString) return 'غير محدد';
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
