// Date formatting that gives the same text on the server and in the browser.

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-11-18" -> "Wed 18 Nov 2026" */
export function formatVisitDate(date: string): string {
  return dayFormat.format(new Date(`${date}T00:00:00Z`));
}

/** Today's date in the browser's time zone as YYYY-MM-DD. */
export function localToday(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** An ISO timestamp in the browser's time zone, e.g. "Wed 18 Nov, 21:43". Browser only. */
export function formatLocalTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
