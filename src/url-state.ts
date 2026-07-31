import type { DateTime } from "luxon";
import { formatPolishDate, parsePolishDate } from "./calculator";

const URL_DATE_PATTERN = /^(\d{4}-\d{2}-\d{2}) (\d{2})-(\d{2})-(\d{2})$/;

export function formatDateForUrl(date: DateTime): string {
  return formatPolishDate(date).replaceAll(":", "-");
}

export function parseDateFromUrl(value: string): DateTime | null {
  const match = URL_DATE_PATTERN.exec(value);
  if (!match) return null;

  const [, date, hours, minutes, seconds] = match;
  return parsePolishDate(`${date} ${hours}:${minutes}:${seconds}`);
}
