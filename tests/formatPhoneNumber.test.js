/**
 * Tests for formatPhoneNumber() function
 * Extracted from index.html lines 580-589
 */

// Extract the function directly since it's a pure function
function formatPhoneNumber(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return '(' + digits;
  if (digits.length <= 6) return '(' + digits.slice(0, 3) + ') ' + digits.slice(3);
  return '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
}

describe('formatPhoneNumber', () => {
  // Basic formatting
  test('returns empty string for null input', () => {
    expect(formatPhoneNumber(null)).toBe('');
  });

  test('returns empty string for undefined input', () => {
    expect(formatPhoneNumber(undefined)).toBe('');
  });

  test('returns empty string for empty string input', () => {
    expect(formatPhoneNumber('')).toBe('');
  });

  test('returns empty string for whitespace-only input', () => {
    expect(formatPhoneNumber('   ')).toBe('');
  });

  test('returns empty string for non-digit input', () => {
    expect(formatPhoneNumber('abc')).toBe('');
  });

  // Partial formatting
  test('formats 1 digit correctly', () => {
    expect(formatPhoneNumber('5')).toBe('(5');
  });

  test('formats 2 digits correctly', () => {
    expect(formatPhoneNumber('55')).toBe('(55');
  });

  test('formats 3 digits correctly', () => {
    expect(formatPhoneNumber('555')).toBe('(555');
  });

  // BUG: 3 digits shows "(555" with no closing paren - inconsistent formatting
  test('BUG: 3 digits has unclosed parenthesis', () => {
    const result = formatPhoneNumber('555');
    // This is a bug - user sees "(555" which is an incomplete format
    expect(result).toBe('(555');
    // It should arguably be "(555)" or wait until 4+ digits
    expect(result.includes(')')).toBe(false); // Confirms the bug
  });

  test('formats 4 digits correctly', () => {
    expect(formatPhoneNumber('5551')).toBe('(555) 1');
  });

  test('formats 6 digits correctly', () => {
    expect(formatPhoneNumber('555123')).toBe('(555) 123');
  });

  test('formats 7 digits correctly', () => {
    expect(formatPhoneNumber('5551234')).toBe('(555) 123-4');
  });

  test('formats full 10-digit number correctly', () => {
    expect(formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
  });

  // Stripping non-digits
  test('strips dashes from input', () => {
    expect(formatPhoneNumber('555-123-4567')).toBe('(555) 123-4567');
  });

  test('strips dots from input', () => {
    expect(formatPhoneNumber('555.123.4567')).toBe('(555) 123-4567');
  });

  test('strips spaces from input', () => {
    expect(formatPhoneNumber('555 123 4567')).toBe('(555) 123-4567');
  });

  test('strips existing parentheses from input', () => {
    expect(formatPhoneNumber('(555) 123-4567')).toBe('(555) 123-4567');
  });

  test('handles mixed non-digit characters', () => {
    expect(formatPhoneNumber('+1 (555) 123-4567')).toBe('(155) 512-3456');
  });

  // BUG: Country code prefix is not handled - "+1 (555) 123-4567" becomes "(155) 512-3456"
  test('BUG: country code +1 prefix is not stripped, corrupts number', () => {
    const result = formatPhoneNumber('+1 (555) 123-4567');
    // The "1" from "+1" is treated as the first digit of area code
    expect(result).not.toBe('(555) 123-4567'); // This is what the user expects
    expect(result).toBe('(155) 512-3456'); // This is what they get - wrong!
  });

  // Truncation to 10 digits
  test('truncates input longer than 10 digits', () => {
    expect(formatPhoneNumber('55512345678901')).toBe('(555) 123-4567');
  });

  // Edge cases
  test('handles "0" as input', () => {
    expect(formatPhoneNumber('0')).toBe('(0');
  });

  test('handles all zeros', () => {
    expect(formatPhoneNumber('0000000000')).toBe('(000) 000-0000');
  });

  test('handles number type coerced to string', () => {
    // This tests what happens if somehow a number is passed
    // The function expects a string but doesn't validate type
    expect(() => formatPhoneNumber(5551234567)).toThrow();
  });

  // Re-formatting already formatted input (simulates re-entry)
  test('handles already-formatted input idempotently', () => {
    const formatted = formatPhoneNumber('5551234567');
    expect(formatPhoneNumber(formatted)).toBe('(555) 123-4567');
  });
});
