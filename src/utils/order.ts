import type { OrderStage } from '../db/database';

// Estagios de preparo em ordem. A sequencia define avancar/voltar no KDS.
export const ORDER_STAGES: OrderStage[] = [
  'aceito',
  'em_preparo',
  'a_caminho',
  'finalizado',
];

export const STAGE_LABELS: Record<OrderStage, string> = {
  aceito: 'Aceito',
  em_preparo: 'Em preparo',
  a_caminho: 'A caminho',
  finalizado: 'Finalizado',
};

// Retorna o proximo estagio, ou null se ja for o ultimo.
export function nextStage(stage: OrderStage): OrderStage | null {
  const i = ORDER_STAGES.indexOf(stage);
  return i >= 0 && i < ORDER_STAGES.length - 1 ? ORDER_STAGES[i + 1] : null;
}

// Retorna o estagio anterior, ou null se ja for o primeiro.
export function prevStage(stage: OrderStage): OrderStage | null {
  const i = ORDER_STAGES.indexOf(stage);
  return i > 0 ? ORDER_STAGES[i - 1] : null;
}
