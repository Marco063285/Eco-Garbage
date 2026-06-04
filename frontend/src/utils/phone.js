



const CM_PHONE_REGEX = /^(\+?237)?[62]\d{8}$/


export function isValidCmPhone(phone) {
  if (!phone) return true // phone is optional
  const cleaned = phone.replace(/[\s\-().]/g, '')
  return CM_PHONE_REGEX.test(cleaned)
}


export function formatCmPhone(raw) {
  const cleaned = raw.replace(/[\s\-().]/g, '')
  let digits = cleaned


  if (digits.startsWith('+237')) digits = digits.slice(4)
  else if (digits.startsWith('237') && digits.length > 9) digits = digits.slice(3)


  digits = digits.replace(/\D/g, '').slice(0, 9)


  let display = '+237 '
  if (digits.length > 0) display += digits[0]
  if (digits.length > 1) display += ' ' + digits.slice(1, 3)
  if (digits.length > 3) display += ' ' + digits.slice(3, 5)
  if (digits.length > 5) display += ' ' + digits.slice(5, 7)
  if (digits.length > 7) display += ' ' + digits.slice(7, 9)

  return display.trimEnd()
}


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
