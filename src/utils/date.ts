export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export function fmtDateID(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function combineDateTime(dateISO: string, hour: number, minute: number): Date {
  return new Date(`${dateISO}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
