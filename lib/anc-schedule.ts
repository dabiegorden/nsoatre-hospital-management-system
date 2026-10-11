import { currentGestationalWeeks } from "@/lib/risk";

/**
 * WHO 2016 antenatal care model: eight contacts, at about 12, 20, 26, 30, 34,
 * 36, 38 and 40 weeks of pregnancy.
 */
export const WHO_CONTACT_WEEKS = [12, 20, 26, 30, 34, 36, 38, 40] as const;

const DAY = 86_400_000;

export interface NextContact {
  contactNumber: number; // 1-8
  week: number;
  date: Date;
}

/** Moves a Saturday or Sunday visit to the following Monday. */
function toWeekday(date: Date) {
  const day = date.getUTCDay();
  if (day === 6) return new Date(date.getTime() + 2 * DAY);
  if (day === 0) return new Date(date.getTime() + DAY);
  return date;
}

/**
 * The next WHO contact after `from`, dated from the expected delivery date.
 * Returns null when the pregnancy is past the final (40-week) contact.
 */
export function nextAncContact(
  expectedDeliveryDate: Date | string,
  from = new Date()
): NextContact | null {
  const edd = new Date(expectedDeliveryDate);
  const weeks = currentGestationalWeeks(edd, null, from);
  if (weeks === null) return null;

  // Require at least ~4 days before the next contact.
  const index = WHO_CONTACT_WEEKS.findIndex((w) => w > weeks + 0.5);
  if (index === -1) return null;

  const week = WHO_CONTACT_WEEKS[index];
  const date = toWeekday(new Date(edd.getTime() - (40 - week) * 7 * DAY));
  return { contactNumber: index + 1, week, date };
}
