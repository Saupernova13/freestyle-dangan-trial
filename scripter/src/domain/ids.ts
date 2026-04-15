/**
 * Generate a unique ID with the given prefix.
 * Format: `{prefix}_{timestamp}_{random6}`
 *
 * Consolidates 5 scattered ID generation patterns from the old codebase
 * into a single, consistent implementation.
 */
export function generateId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Generate a human-readable character ID.
 * Format: `{SurnameInitial}{NameInitial}_{YYYYMMDD}_{RANDOM6}`
 *
 * Matches the format from characterModal.js:generateCharacterId()
 */
export function generateCharacterId(name: string, surname: string, dob: string): string {
  const cleanName = (name.charAt(0).toUpperCase().replace(/[^A-Za-z0-9]/g, '') || 'X');
  const cleanSurname = (surname.charAt(0).toUpperCase().replace(/[^A-Za-z0-9]/g, '') || 'Y');
  const dobFormatted = dob.replace(/-/g, '');
  const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${cleanSurname}${cleanName}_${dobFormatted}_${randomString}`;
}
