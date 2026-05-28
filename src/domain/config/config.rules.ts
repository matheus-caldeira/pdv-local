export interface BusinessInfoInput {
  name: string;
  document: string;
  phone: string;
  address: string;
}

export function buildBusinessInfo(input: BusinessInfoInput): BusinessInfoInput {
  return {
    name: input.name.trim(),
    document: input.document.trim(),
    phone: input.phone.trim(),
    address: input.address.trim(),
  };
}

export function normalizeTicketLimit(limit: number): number {
  return Math.max(1, Math.floor(Number.isFinite(limit) ? limit : 1));
}

export function normalizeTicketCounter(counter: number): number {
  return Math.max(1, Math.floor(Number.isFinite(counter) ? counter : 1));
}

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
