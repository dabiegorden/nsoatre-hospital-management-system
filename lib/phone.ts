/**
 * Normalises a phone number to E.164. Local Ghana numbers ("0244123456")
 * become "+233244123456"; numbers already in international form are kept.
 * Returns null when the input can't be a phone number.
 */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 9) return null;

  if (trimmed.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("233") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) {
    return `+233${digits.slice(1)}`;
  }
  // 9-digit Ghana subscriber number without the leading 0
  if (digits.length === 9) return `+233${digits}`;
  return `+${digits}`;
}

/** Arkesel expects international digits without "+" (e.g. 233244123456). */
export function toArkesel(raw: string | null | undefined): string | null {
  const e164 = toE164(raw);
  return e164 ? e164.slice(1) : null;
}

export function isGhanaNumber(e164: string) {
  return e164.startsWith("+233");
}
