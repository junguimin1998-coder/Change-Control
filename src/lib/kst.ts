// 이 시스템은 한국 사업장 전용이므로, 서버가 어느 시간대에서 돌든
// "오늘 날짜"는 항상 한국 표준시(KST) 기준으로 계산합니다.

function kstDateParts(d: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return { year: Number(get("year")), month: Number(get("month")), day: Number(get("day")) };
}

// 채번용: YYMMDD
export function kstDateStamp(d: Date = new Date()): string {
  const { year, month, day } = kstDateParts(d);
  const yy = String(year).slice(-2);
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

// target 날짜가 KST 기준 오늘로부터 며칠 후인지 (음수면 이미 지남)
export function daysUntilKST(target: Date): number {
  const today = kstDateParts(new Date());
  const t = kstDateParts(target);
  const todayUTC = Date.UTC(today.year, today.month - 1, today.day);
  const targetUTC = Date.UTC(t.year, t.month - 1, t.day);
  return Math.round((targetUTC - todayUTC) / 86400000);
}
