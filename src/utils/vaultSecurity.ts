/**
 * MATRIX Password Vault - Security & URL Utilities
 * 
 * Strict sanitization, safe URL handling, password strength analysis,
 * and cryptographically secure password generation.
 */

export interface PasswordStrengthResult {
  score: number; // 0 to 4
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
  widthPercent: number;
}

/**
 * Validates and sanitizes a URL to ensure it only uses http: or https: protocols.
 * Strictly forbids javascript:, data:, vbscript:, and file: schemes to prevent XSS.
 */
export function sanitizeUrl(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // If no scheme was entered, allow prefixing with https:// for common user inputs (e.g. "github.com")
  let urlToParse = trimmed;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    urlToParse = `https://${trimmed}`;
  }

  try {
    const parsed = new URL(urlToParse);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Safely extracts the display hostname from a URL for list badge presentation.
 */
export function extractHostname(url?: string | null): string | null {
  const sanitized = sanitizeUrl(url);
  if (!sanitized) return null;
  try {
    const parsed = new URL(sanitized);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Evaluates password strength on a 0-4 scale.
 * 0 = Very Weak, 1 = Weak, 2 = Fair, 3 = Strong, 4 = Very Strong
 */
export function calculatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return {
      score: 0,
      label: 'Empty',
      color: '#ef4444',
      bgClass: 'bg-red-500',
      textClass: 'text-red-600 dark:text-red-400',
      widthPercent: 0,
    };
  }

  let points = 0;
  const len = password.length;

  if (len >= 8) points += 1;
  if (len >= 12) points += 1;
  if (len >= 16) points += 1;
  if (len >= 20) points += 1;

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  const diversity = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  if (diversity >= 3) points += 1;
  if (diversity === 4) points += 1;

  // Penalize obvious repetitions or short length
  if (len < 8) points = 0;
  else if (len < 10 && diversity < 3) points = Math.min(points, 1);

  // Normalize points to 0-4
  let score = 0;
  if (points <= 1) score = 0;
  else if (points <= 2) score = 1;
  else if (points <= 3) score = 2;
  else if (points <= 4) score = 3;
  else score = 4;

  switch (score) {
    case 0:
      return {
        score: 0,
        label: 'Very Weak',
        color: '#ef4444',
        bgClass: 'bg-red-500',
        textClass: 'text-red-600 dark:text-red-400',
        widthPercent: 20,
      };
    case 1:
      return {
        score: 1,
        label: 'Weak',
        color: '#f97316',
        bgClass: 'bg-orange-500',
        textClass: 'text-orange-600 dark:text-orange-400',
        widthPercent: 40,
      };
    case 2:
      return {
        score: 2,
        label: 'Fair',
        color: '#eab308',
        bgClass: 'bg-amber-500',
        textClass: 'text-amber-600 dark:text-amber-400',
        widthPercent: 60,
      };
    case 3:
      return {
        score: 3,
        label: 'Strong',
        color: '#10b981',
        bgClass: 'bg-emerald-500',
        textClass: 'text-emerald-600 dark:text-emerald-400',
        widthPercent: 80,
      };
    case 4:
    default:
      return {
        score: 4,
        label: 'Very Strong',
        color: '#06b6d4',
        bgClass: 'bg-cyan-500',
        textClass: 'text-cyan-600 dark:text-cyan-400',
        widthPercent: 100,
      };
  }
}

/**
 * Generates a cryptographically strong random password using crypto.getRandomValues.
 */
export interface PasswordGeneratorOptions {
  length?: number;
  uppercase?: boolean;
  lowercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
}

export function generateSecurePassword(options: PasswordGeneratorOptions = {}): string {
  const {
    length = 20,
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = true,
  } = options;

  const upperChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude ambiguous I, O
  const lowerChars = 'abcdefghijkmnopqrstuvwxyz'; // exclude ambiguous l
  const numberChars = '23456789'; // exclude ambiguous 0, 1
  const symbolChars = '!@#$%^&*()-_=+[]{}|;:,.<>?';

  let charset = '';
  const requiredChars: string[] = [];

  if (uppercase) {
    charset += upperChars;
    requiredChars.push(getRandomChar(upperChars));
  }
  if (lowercase) {
    charset += lowerChars;
    requiredChars.push(getRandomChar(lowerChars));
  }
  if (numbers) {
    charset += numberChars;
    requiredChars.push(getRandomChar(numberChars));
  }
  if (symbols) {
    charset += symbolChars;
    requiredChars.push(getRandomChar(symbolChars));
  }

  if (!charset) {
    charset = lowerChars + upperChars + numberChars;
  }

  const remainingLength = Math.max(0, length - requiredChars.length);
  const randomChars: string[] = [];

  for (let i = 0; i < remainingLength; i++) {
    randomChars.push(getRandomChar(charset));
  }

  // Shuffle the required and random characters using Fisher-Yates with crypto.getRandomValues
  const combined = [...requiredChars, ...randomChars];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = getRandomInt(i + 1);
    const temp = combined[i];
    combined[i] = combined[j];
    combined[j] = temp;
  }

  return combined.join('');
}

function getRandomChar(charset: string): string {
  const index = getRandomInt(charset.length);
  return charset.charAt(index);
}

function getRandomInt(max: number): number {
  if (max <= 1) return 0;
  const array = new Uint32Array(1);
  const maxValid = Math.floor(0xffffffff / max) * max;
  let val: number;
  do {
    crypto.getRandomValues(array);
    val = array[0];
  } while (val >= maxValid);
  return val % max;
}
