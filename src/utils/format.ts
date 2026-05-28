export function formatMoney(value: number): string {
  return 'R$ ' + value.toFixed(2).replace('.', ',')
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('pt-BR')
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(ts: number): string {
  return formatDate(ts) + ' ' + formatTime(ts)
}

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

// Formata o numero da comanda com zeros a esquerda. A quantidade de digitos
// deriva do limite: limite 9999 -> 4 digitos, limite 100 -> 3 digitos.
export function formatTicket(n: number, limit: number): string {
  const digits = Math.max(1, String(Math.max(1, limit)).length)
  return String(n).padStart(digits, '0')
}

// Calcula o proximo valor do contador, aplicando o reset automatico quando
// ligado: ao passar do limite a sequencia volta para 1.
export function nextTicketCounter(
  current: number,
  limit: number,
  autoReset: boolean,
): number {
  const next = current + 1
  if (autoReset && next > limit) return 1
  return next
}
