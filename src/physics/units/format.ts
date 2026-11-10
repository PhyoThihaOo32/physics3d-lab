export function formatNumber(value: number | null, digits = 2) {
  if (value === null || !Number.isFinite(value)) return '—';
  return (Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value).toFixed(digits);
}
