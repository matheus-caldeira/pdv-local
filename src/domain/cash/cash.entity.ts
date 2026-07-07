export interface Session {
  id?: number;
  uid: string;
  openedAt: number;
  closedAt: number | null;
  cashInitial: number;
  cashFinal: number | null;
  notes: string;
}

export type NewSession = Omit<Session, 'id'>;

export type CashMovementType = 'sangria' | 'suprimento';

export interface CashMovement {
  id?: number;
  uid: string;
  sessionUid: string;
  type: CashMovementType;
  amount: number;
  reason: string;
  createdAt: number;
}

export type NewCashMovement = Omit<CashMovement, 'id'>;
