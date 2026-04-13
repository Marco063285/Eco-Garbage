// Cameroon phone number validation and formatting
// Valid formats: +237 6XXXXXXXX (mobile), +237 2XXXXXXXX (landline)
// 9 digits after country code

const CM_PHONE_REGEX = /^(\+?237)?[62]\d{8}$/

/**
 * Validate a Cameroon phone number.
 * Accepts: 6XXXXXXXX, 2XXXXXXXX, +237XXXXXXXXX, 237XXXXXXXXX
 */
export function isValidCmPhone(phone) {
  if (!phone) return true // phone is optional
  const cleaned = phone.replace(/[\s\-().]/g, '')
  return CM_PHONE_REGEX.test(cleaned)
}

/**
 * Format a phone string to +237 X XX XX XX XX
 */
export function formatCmPhone(raw) {
  const cleaned = raw.replace(/[\s\-().]/g, '')
  let digits = cleaned

  // Strip leading +237 or 237
  if (digits.startsWith('+237')) digits = digits.slice(4)
  else if (digits.startsWith('237') && digits.length > 9) digits = digits.slice(3)

  // Only keep digits
  digits = digits.replace(/\D/g, '').slice(0, 9)

  // Build display: +237 X XX XX XX XX
  let display = '+237 '
  if (digits.length > 0) display += digits[0]
  if (digits.length > 1) display += ' ' + digits.slice(1, 3)
  if (digits.length > 3) display += ' ' + digits.slice(3, 5)
  if (digits.length > 5) display += ' ' + digits.slice(5, 7)
  if (digits.length > 7) display += ' ' + digits.slice(7, 9)

  return display.trimEnd()
}

/**
 * Normalize to storable format: +237XXXXXXXXX
 */
export function normalizeCmPhone(raw) {
  if (!raw) return ''
  const cleaned = raw.replace(/[\s\-().]/g, '')
  let digits = cleaned
  if (digits.startsWith('+237')) digits = digits.slice(4)
  else if (digits.startsWith('237') && digits.length > 9) digits = digits.slice(3)
  digits = digits.replace(/\D/g, '').slice(0, 9)
  if (!digits) return ''
  return '+237' + digits
}
