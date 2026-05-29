import { useState } from 'react';
import { DoorClosed, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Money } from '../atoms/Money';
import { Modal } from '../molecules/Modal';
import { FormField } from '../molecules/FormField';
import { TextField } from '../molecules/TextField';
import { useCash } from '../hooks/useCash';
import { formatTime, formatDate } from '../../domain/shared/format';
import type { CashMovementType } from '../../domain/cash/cash.entity';

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  credito: 'Credito',
  debito: 'Debito',
  dinheiro: 'Dinheiro',
  pagar_depois: 'Pagar Depois',
  outros: 'Outros',
};

function paymentLabel(method: string): string {
  return PAYMENT_LABELS[method] ?? method;
}

export function CashPage() {
  const { summary, openSession, closeSession, addMovement } = useCash();

  const [cashInitial, setCashInitial] = useState('');
  const [cashFinal, setCashFinal] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [movementModal, setMovementModal] = useState<CashMovementType | null>(
    null,
  );
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [closeModal, setCloseModal] = useState(false);

  const session = summary?.session ?? null;
  const movements = summary?.movements ?? [];
  const salesByMethod = summary?.salesByMethod ?? {};
  const cashSales = summary?.cashSales ?? 0;
  const expectedCash = summary?.expectedCash ?? 0;
  const pastSessions = summary?.pastSessions ?? [];

  const totalSangrias = movements
    .filter((m) => m.type === 'sangria')
    .reduce((s, m) => s + m.amount, 0);
  const totalSuprimentos = movements
    .filter((m) => m.type === 'suprimento')
    .reduce((s, m) => s + m.amount, 0);

  async function handleOpen() {
    const ok = await openSession(parseFloat(cashInitial) || 0);
    if (ok) setCashInitial('');
  }

  async function handleClose() {
    const ok = await closeSession(parseFloat(cashFinal) || 0, closeNotes);
    if (ok) {
      setCashFinal('');
      setCloseNotes('');
      setCloseModal(false);
    }
  }

  async function handleMovement(type: CashMovementType) {
    const ok = await addMovement({
      type,
      amount: parseFloat(movementAmount) || 0,
      reason: movementReason,
    });
    if (ok) {
      setMovementAmount('');
      setMovementReason('');
      setMovementModal(null);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Caixa</h1>
      </div>

      {!session ? (
        <div className="mx-auto flex max-w-sm flex-col items-center gap-3 rounded-xl border border-border bg-surface-2 px-6 py-10 text-center">
          <h2 className="text-lg font-bold tracking-tight">Abrir Caixa</h2>
          <p className="text-sm text-ink-tertiary">
            Informe o valor inicial em dinheiro
          </p>
          <FormField label="Dinheiro Inicial (R$)" className="w-full">
            <TextField
              type="number"
              inputMode="decimal"
              step="0.01"
              value={cashInitial}
              onChange={(e) => setCashInitial(e.target.value)}
              placeholder="0,00"
            />
          </FormField>
          <Button fullWidth onClick={handleOpen}>
            Abrir Sessao
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-success">
              <span className="h-2 w-2 rounded-full bg-success" />
              Aberto desde {formatTime(session.openedAt)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCloseModal(true)}
            >
              <DoorClosed size={16} /> Fechar Caixa
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1 rounded-md border border-border bg-surface-2 px-4 py-3">
              <span className="text-xs font-semibold text-ink-tertiary">
                Dinheiro Inicial
              </span>
              <Money
                value={session.cashInitial}
                className="text-lg font-bold"
              />
            </div>
            <div className="flex flex-col gap-1 rounded-md border border-border bg-surface-2 px-4 py-3">
              <span className="text-xs font-semibold text-ink-tertiary">
                Vendas Dinheiro
              </span>
              <span className="text-lg font-bold text-success">
                + <Money value={cashSales} />
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-md border border-border bg-surface-2 px-4 py-3">
              <span className="text-xs font-semibold text-ink-tertiary">
                Suprimentos
              </span>
              <span className="text-lg font-bold text-info">
                + <Money value={totalSuprimentos} />
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-md border border-border bg-surface-2 px-4 py-3">
              <span className="text-xs font-semibold text-ink-tertiary">
                Sangrias
              </span>
              <span className="text-lg font-bold text-danger">
                - <Money value={totalSangrias} />
              </span>
            </div>
            <div className="col-span-2 flex flex-col gap-1 rounded-md border border-border-emphasis bg-surface-inset px-4 py-3">
              <span className="text-xs font-semibold text-ink-secondary">
                Esperado no Caixa
              </span>
              <Money value={expectedCash} className="text-2xl font-extrabold" />
            </div>
          </div>

          {Object.keys(salesByMethod).length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
                Vendas por Forma de Pagamento
              </h3>
              <div className="flex flex-col gap-1">
                {Object.entries(salesByMethod).map(([method, total]) => (
                  <div
                    key={method}
                    className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-4 py-2"
                  >
                    <span className="text-sm text-ink-secondary">
                      {paymentLabel(method)}
                    </span>
                    <Money value={total} className="font-bold" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => setMovementModal('sangria')}>
              <ArrowUpCircle size={18} /> Sangria
            </Button>
            <Button
              variant="ghost"
              onClick={() => setMovementModal('suprimento')}
            >
              <ArrowDownCircle size={18} /> Suprimento
            </Button>
          </div>

          {movements.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
                Movimentacoes
              </h3>
              <div className="flex flex-col gap-1">
                {movements.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-4 py-2"
                  >
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-ink-primary">
                        {m.type === 'sangria' ? 'Sangria' : 'Suprimento'}
                      </span>
                      {m.reason && (
                        <span className="ml-2 text-sm text-ink-tertiary">
                          {m.reason}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={
                          m.type === 'sangria'
                            ? 'font-bold text-danger'
                            : 'font-bold text-info'
                        }
                      >
                        {m.type === 'sangria' ? '- ' : '+ '}
                        <Money value={m.amount} />
                      </span>
                      <span className="text-xs text-ink-muted">
                        {formatTime(m.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {pastSessions.length > 0 && (
        <div className="mt-6 flex flex-col gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
            Sessoes Anteriores
          </h3>
          <div className="flex flex-col gap-1">
            {pastSessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-4 py-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink-primary">
                    {formatDate(s.openedAt)}
                  </div>
                  <div className="text-xs text-ink-tertiary">
                    {formatTime(s.openedAt)} - {formatTime(s.closedAt!)}
                  </div>
                </div>
                <div className="flex flex-col items-end text-xs text-ink-tertiary">
                  <span>
                    Inicial: <Money value={s.cashInitial} />
                  </span>
                  <span>
                    Final: <Money value={s.cashFinal ?? 0} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        open={movementModal !== null}
        onClose={() => setMovementModal(null)}
        title={movementModal === 'sangria' ? 'Sangria' : 'Suprimento'}
      >
        <div className="grid grid-cols-1 gap-3">
          <FormField label="Valor (R$)">
            <TextField
              type="number"
              inputMode="decimal"
              step="0.01"
              value={movementAmount}
              onChange={(e) => setMovementAmount(e.target.value)}
              placeholder="0,00"
            />
          </FormField>
          <FormField label="Motivo (opcional)">
            <TextField
              value={movementReason}
              onChange={(e) => setMovementReason(e.target.value)}
              placeholder="Ex: Troco, pagamento fornecedor..."
            />
          </FormField>
        </div>
        <div className="mt-4">
          <Button fullWidth onClick={() => handleMovement(movementModal!)}>
            Confirmar
          </Button>
        </div>
      </Modal>

      <Modal
        open={closeModal}
        onClose={() => setCloseModal(false)}
        title="Fechar Caixa"
      >
        <p className="mb-4 text-sm text-ink-secondary">
          Valor esperado: <Money value={expectedCash} className="font-bold" />
        </p>
        <div className="grid grid-cols-1 gap-3">
          <FormField label="Valor Contado no Caixa (R$)">
            <TextField
              type="number"
              inputMode="decimal"
              step="0.01"
              value={cashFinal}
              onChange={(e) => setCashFinal(e.target.value)}
              placeholder="0,00"
            />
          </FormField>
          <FormField label="Observacoes (opcional)">
            <TextField
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              placeholder="Observacoes do fechamento..."
            />
          </FormField>
        </div>
        <div className="mt-4">
          <Button fullWidth onClick={handleClose}>
            Confirmar Fechamento
          </Button>
        </div>
      </Modal>
    </div>
  );
}
