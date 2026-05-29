export function formatMoney(value: number): string {
  return 'R$ ' + value.toFixed(2).replace('.', ',');
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('pt-BR');
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(timestamp: number): string {
  return formatDate(timestamp) + ' ' + formatTime(timestamp);
}
