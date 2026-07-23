import { AlarmClock } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { SearchField } from '../../molecules/SearchField';
import { Select } from '../../molecules/Select';
import type {
  FamilyMember,
  FinanceCategory,
} from '../../../domain/finance/finance.entity';
import type { PaymentMethod } from '../../../domain/finance/payment-method.entity';
import type { FinanceEntryFiltersState } from '../../hooks/useFinanceEntries';

interface FinanceEntriesFiltersProps {
  filters: FinanceEntryFiltersState;
  onFiltersChange(filters: FinanceEntryFiltersState): void;
  categories: FinanceCategory[];
  members: FamilyMember[];
  paymentMethods: PaymentMethod[];
  overdueMode: boolean;
  overdueCount: number;
  onToggleOverdue(): void;
}

export function FinanceEntriesFilters({
  filters,
  onFiltersChange,
  categories,
  members,
  paymentMethods,
  overdueMode,
  overdueCount,
  onToggleOverdue,
}: FinanceEntriesFiltersProps) {
  function patch(changes: Partial<FinanceEntryFiltersState>) {
    onFiltersChange({ ...filters, ...changes });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <SearchField
          aria-label="Buscar lançamentos"
          placeholder="Buscar por descrição..."
          value={filters.text}
          disabled={overdueMode}
          onChange={(event) => patch({ text: event.target.value })}
        />
        <Button
          variant={overdueMode ? 'accent' : 'ghost'}
          size="sm"
          aria-pressed={overdueMode}
          className="shrink-0"
          onClick={onToggleOverdue}
        >
          <AlarmClock size={16} /> Atrasadas ({overdueCount})
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <Select
          aria-label="Filtrar por status"
          value={filters.status}
          disabled={overdueMode}
          onChange={(event) =>
            patch({
              status: event.target.value as FinanceEntryFiltersState['status'],
            })
          }
        >
          <option value="">Todos os status</option>
          <option value="pending">Pendente</option>
          <option value="paid">Pago</option>
        </Select>
        <Select
          aria-label="Filtrar por tipo"
          value={filters.kind}
          disabled={overdueMode}
          onChange={(event) =>
            patch({
              kind: event.target.value as FinanceEntryFiltersState['kind'],
            })
          }
        >
          <option value="">Todos os tipos</option>
          <option value="income">Entrada</option>
          <option value="expense">Saída</option>
        </Select>
        <Select
          aria-label="Filtrar por categoria"
          value={filters.categoryUid}
          disabled={overdueMode}
          onChange={(event) => patch({ categoryUid: event.target.value })}
        >
          <option value="">Todas as categorias</option>
          {categories.map((category) => (
            <option key={category.uid} value={category.uid}>
              {category.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filtrar por membro"
          value={filters.memberUid}
          disabled={overdueMode}
          onChange={(event) => patch({ memberUid: event.target.value })}
        >
          <option value="">Todos os membros</option>
          {members.map((member) => (
            <option key={member.uid} value={member.uid}>
              {member.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filtrar por meio de pagamento"
          value={filters.paymentMethodUid}
          disabled={overdueMode}
          onChange={(event) => patch({ paymentMethodUid: event.target.value })}
        >
          <option value="">Todos os meios de pagamento</option>
          {paymentMethods.map((method) => (
            <option key={method.uid} value={method.uid}>
              {method.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
