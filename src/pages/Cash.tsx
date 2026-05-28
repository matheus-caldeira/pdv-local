import { useState, useEffect } from 'react';
import { DoorClosed, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { db, type Session, type CashMovement } from '../db/database';
import { useSession } from '../hooks/useSession';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { formatMoney, formatTime, formatDate } from '../utils/format';
import './Cash.css';

const LOGO_URL = `${import.meta.env.BASE_URL}logo.png`;

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  credito: 'Credito',
  debito: 'Debito',
  dinheiro: 'Dinheiro',
  pagar_depois: 'Pagar Depois',
};

export function Cash() {
  const { activeSession, openSession, closeSession } = useSession();
  const toast = useToast();

  const [cashInitial, setCashInitial] = useState('');
  const [cashFinal, setCashFinal] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [movementModal, setMovementModal] = useState<
    'sangria' | 'suprimento' | null
  >(null);
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [closeModal, setCloseModal] = useState(false);
  const [summary, setSummary] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
  }, [activeSession]);

  async function loadData() {
    const allSessions = await db.sessions.toArray();
    setSessions(allSessions.sort((a, b) => b.openedAt - a.openedAt));

    if (activeSession?.id) {
      const mvts = await db.cashMovements
        .where('sessionId')
        .equals(activeSession.id)
        .toArray();
      setMovements(mvts);

      const orders = await db.orders
        .where('sessionId')
        .equals(activeSession.id)
        .toArray();
      const byMethod: Record<string, number> = {};
      orders
        .filter((o) => o.status === 'paid')
        .forEach((o) => {
          const m = o.paymentMethod || 'outros';
          byMethod[m] = (byMethod[m] || 0) + o.total;
        });
      setSummary(byMethod);
    }
  }

  async function handleOpen() {
    const val = parseFloat(cashInitial) || 0;
    await openSession(val);
    setCashInitial('');
    toast('Caixa aberto!');
    loadData();
  }

  async function handleClose() {
    const val = parseFloat(cashFinal) || 0;
    await closeSession(val, closeNotes);
    setCashFinal('');
    setCloseNotes('');
    setCloseModal(false);
    toast('Caixa fechado!');
    loadData();
  }

  async function addMovement() {
    if (!movementModal || !activeSession?.id) return;
    const amount = parseFloat(movementAmount) || 0;
    if (amount <= 0) {
      toast('Informe o valor', 'error');
      return;
    }

    await db.cashMovements.add({
      sessionId: activeSession.id,
      type: movementModal,
      amount,
      reason: movementReason.trim(),
      createdAt: Date.now(),
    });

    setMovementAmount('');
    setMovementReason('');
    setMovementModal(null);
    toast(
      movementModal === 'sangria'
        ? 'Sangria registrada'
        : 'Suprimento registrado',
    );
    loadData();
  }

  const totalSangrias = movements
    .filter((m) => m.type === 'sangria')
    .reduce((s, m) => s + m.amount, 0);
  const totalSuprimentos = movements
    .filter((m) => m.type === 'suprimento')
    .reduce((s, m) => s + m.amount, 0);
  const totalDinheiro = summary.dinheiro || 0;
  const expectedCash =
    (activeSession?.cashInitial || 0) +
    totalDinheiro +
    totalSuprimentos -
    totalSangrias;

  return (
    <div className="cash-page">
      <div className="page-header">
        <h1>Caixa</h1>
      </div>

      {!activeSession ? (
        /* Open session */
        <div className="cash-open-card">
          <img src={LOGO_URL} alt="PDV Local" className="cash-open-logo" />
          <h2>Abrir Caixa</h2>
          <p>Informe o valor inicial em dinheiro</p>
          <div className="form-field" style={{ width: '100%', maxWidth: 280 }}>
            <label>Dinheiro Inicial (R$)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={cashInitial}
              onChange={(e) => setCashInitial(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <button className="btn btn-accent" onClick={handleOpen}>
            Abrir Sessao
          </button>
        </div>
      ) : (
        /* Active session */
        <div className="cash-active">
          <div className="cash-status-bar">
            <div className="cash-status-left">
              <span className="session-dot-sm" />
              <span>Aberto desde {formatTime(activeSession.openedAt)}</span>
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setCloseModal(true)}
            >
              <DoorClosed size={16} /> Fechar Caixa
            </button>
          </div>

          <div className="cash-summary-grid">
            <div className="cash-summary-card">
              <span className="cash-sum-label">Dinheiro Inicial</span>
              <span className="cash-sum-value tabular">
                {formatMoney(activeSession.cashInitial)}
              </span>
            </div>
            <div className="cash-summary-card">
              <span className="cash-sum-label">Vendas Dinheiro</span>
              <span
                className="cash-sum-value tabular"
                style={{ color: 'var(--success)' }}
              >
                + {formatMoney(totalDinheiro)}
              </span>
            </div>
            <div className="cash-summary-card">
              <span className="cash-sum-label">Suprimentos</span>
              <span
                className="cash-sum-value tabular"
                style={{ color: 'var(--info)' }}
              >
                + {formatMoney(totalSuprimentos)}
              </span>
            </div>
            <div className="cash-summary-card">
              <span className="cash-sum-label">Sangrias</span>
              <span
                className="cash-sum-value tabular"
                style={{ color: 'var(--danger)' }}
              >
                - {formatMoney(totalSangrias)}
              </span>
            </div>
            <div className="cash-summary-card cash-sum-total">
              <span className="cash-sum-label">Esperado no Caixa</span>
              <span className="cash-sum-value-lg tabular">
                {formatMoney(expectedCash)}
              </span>
            </div>
          </div>

          {/* By payment method */}
          {Object.keys(summary).length > 0 && (
            <div className="cash-methods">
              <h3 className="section-label">Vendas por Forma de Pagamento</h3>
              <div className="cash-methods-list">
                {Object.entries(summary).map(([method, total]) => (
                  <div key={method} className="cash-method-row">
                    <span>{PAYMENT_LABELS[method] || method}</span>
                    <span
                      className="tabular"
                      style={{ fontWeight: 'var(--weight-bold)' }}
                    >
                      {formatMoney(total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="cash-movement-actions">
            <button
              className="btn btn-outline"
              onClick={() => setMovementModal('sangria')}
            >
              <ArrowUpCircle size={18} /> Sangria
            </button>
            <button
              className="btn btn-outline"
              onClick={() => setMovementModal('suprimento')}
            >
              <ArrowDownCircle size={18} /> Suprimento
            </button>
          </div>

          {movements.length > 0 && (
            <div className="cash-movements">
              <h3 className="section-label">Movimentacoes</h3>
              {movements
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((m) => (
                  <div key={m.id} className="movement-row">
                    <div>
                      <span className={`movement-type ${m.type}`}>
                        {m.type === 'sangria' ? 'Sangria' : 'Suprimento'}
                      </span>
                      {m.reason && (
                        <span className="movement-reason">{m.reason}</span>
                      )}
                    </div>
                    <div className="movement-right">
                      <span className={`movement-amount tabular ${m.type}`}>
                        {m.type === 'sangria' ? '- ' : '+ '}
                        {formatMoney(m.amount)}
                      </span>
                      <span className="movement-time">
                        {formatTime(m.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Past sessions */}
      {sessions.filter((s) => s.closedAt).length > 0 && (
        <div className="past-sessions">
          <h3 className="section-label">Sessoes Anteriores</h3>
          {sessions
            .filter((s) => s.closedAt)
            .map((s) => (
              <div key={s.id} className="past-session-row">
                <div>
                  <span className="past-date">{formatDate(s.openedAt)}</span>
                  <span className="past-time">
                    {formatTime(s.openedAt)} - {formatTime(s.closedAt!)}
                  </span>
                </div>
                <div className="past-cash">
                  <span className="past-initial">
                    Inicial: {formatMoney(s.cashInitial)}
                  </span>
                  <span className="past-final">
                    Final: {formatMoney(s.cashFinal || 0)}
                  </span>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Movement modal */}
      <Modal
        open={!!movementModal}
        onClose={() => setMovementModal(null)}
        title={movementModal === 'sangria' ? 'Sangria' : 'Suprimento'}
      >
        <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="form-field">
            <label>Valor (R$)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={movementAmount}
              onChange={(e) => setMovementAmount(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div className="form-field">
            <label>Motivo (opcional)</label>
            <input
              type="text"
              value={movementReason}
              onChange={(e) => setMovementReason(e.target.value)}
              placeholder="Ex: Troco, pagamento fornecedor..."
            />
          </div>
        </div>
        <button
          className="btn btn-accent btn-full"
          onClick={addMovement}
          style={{ marginTop: 'var(--space-4)' }}
        >
          Confirmar
        </button>
      </Modal>

      {/* Close session modal */}
      <Modal
        open={closeModal}
        onClose={() => setCloseModal(false)}
        title="Fechar Caixa"
      >
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--ink-secondary)',
            marginBottom: 'var(--space-4)',
          }}
        >
          Valor esperado:{' '}
          <strong className="tabular">{formatMoney(expectedCash)}</strong>
        </p>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="form-field">
            <label>Valor Contado no Caixa (R$)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={cashFinal}
              onChange={(e) => setCashFinal(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div className="form-field">
            <label>Observacoes (opcional)</label>
            <input
              type="text"
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              placeholder="Observacoes do fechamento..."
            />
          </div>
        </div>
        <button
          className="btn btn-accent btn-full"
          onClick={handleClose}
          style={{ marginTop: 'var(--space-4)' }}
        >
          Confirmar Fechamento
        </button>
      </Modal>
    </div>
  );
}
