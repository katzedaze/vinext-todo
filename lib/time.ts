export const DISPLAY_TIME_ZONE = "Asia/Tokyo";

const formatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: DISPLAY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** D1 の datetime('now')（UTC の "YYYY-MM-DD HH:MM:SS"）を ISO 8601 に直す */
export function toIsoUtc(d1DateTime: string): string {
  return `${d1DateTime.replace(" ", "T")}Z`;
}

/** 東京時間の "YYYY-MM-DD HH:MM" で表す。タイムゾーンを固定するのでサーバーとブラウザで結果が一致する */
export function formatTokyo(d1DateTime: string): string {
  const date = new Date(toIsoUtc(d1DateTime));
  if (Number.isNaN(date.getTime())) return d1DateTime;
  return formatter.format(date);
}
