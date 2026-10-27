const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** The API sends UTC timestamps ending in "Z"; this tolerates a missing one. */
function parse(value: string) {
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);
}

export const formatDate = (value: string | null | undefined) =>
  value ? dateFormat.format(parse(value)) : "";

export const formatDateTime = (value: string | null | undefined) =>
  value ? dateTimeFormat.format(parse(value)) : "";

export function relativeTime(value: string, now = Date.now()) {
  const seconds = Math.round((now - parse(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return formatDate(value);
}
