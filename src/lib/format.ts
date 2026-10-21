// 서버(Vercel)는 UTC로 동작하므로 날짜는 항상 한국 시간(KST, UTC+9) 기준으로 다룬다.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 10)
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/** Date → "YYYY-MM-DD" (KST) */
export function kstDateKey(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Date(d.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Date → "HH:mm" (KST) */
export function kstTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Date(d.getTime() + KST_OFFSET_MS).toISOString().slice(11, 16);
}

/** "YYYY-MM-DD" + "HH:mm" (KST) → Date */
export function fromKst(dateKey: string, time = "00:00") {
  return new Date(`${dateKey}T${time}:00+09:00`);
}

/** "YYYY-MM-DD" 에 n일을 더한 키 */
export function addDaysKey(dateKey: string, days: number) {
  const d = new Date(`${dateKey}T00:00:00Z`);
  return new Date(d.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function weekdayOfKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00Z`).getUTCDay();
}

/** "10/25(토)" */
export function formatDateKey(dateKey: string) {
  const [, m, d] = dateKey.split("-");
  return `${Number(m)}/${Number(d)}(${WEEKDAYS[weekdayOfKey(dateKey)]})`;
}

/** "10/25(토) 14:00" */
export function formatDateTime(date: Date | string) {
  return `${formatDateKey(kstDateKey(date))} ${kstTime(date)}`;
}

export { WEEKDAYS };
