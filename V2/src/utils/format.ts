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
