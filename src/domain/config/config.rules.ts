export function formatTicket(counter: number, limit: number): string {
  const digits = Math.max(1, String(Math.max(1, limit)).length);
  return String(counter).padStart(digits, '0');
}

export function nextTicketCounter(
  current: number,
  limit: number,
  autoReset: boolean,
): number {
  const next = current + 1;
  if (autoReset && next > limit) return 1;
  return next;
}
