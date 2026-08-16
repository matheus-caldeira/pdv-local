function localDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function shouldPromptBackup(
  lastPromptAt: number | undefined,
  now: number,
): boolean {
  if (lastPromptAt === undefined) return true;
  if (lastPromptAt > now) return false;
  return localDayKey(lastPromptAt) !== localDayKey(now);
}
