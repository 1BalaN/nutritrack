/**
 * Display / input strings for nutrition values: no arbitrary rounding to 1 decimal;
 * trims float noise from IEEE arithmetic.
 */
export function formatNutritionNumber(n: number): string {
  if (!Number.isFinite(n)) return '—'
  if (n === 0 || Object.is(n, -0)) return '0'
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  const trimmed = abs.toFixed(12).replace(/\.?0+$/, '')
  return sign + trimmed
}

/** Prefill numeric TextInputs from DB `real` values without float junk. */
export function numberToInputString(n: number): string {
  return formatNutritionNumber(n)
}
