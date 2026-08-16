import { AppError, type ErrorLayer } from './shared/errors';
import { formatMoney } from './shared/format';

export abstract class DomainError extends AppError {
  readonly layer: ErrorLayer = 'domain';
}

export class EmptyCartError extends DomainError {
  readonly code = 'EMPTY_CART';

  constructor() {
    super('O carrinho está vazio.');
  }
}

export class RequiredCustomizationMissingError extends DomainError {
  readonly code = 'REQUIRED_CUSTOMIZATION_MISSING';
  readonly groupName: string;
  readonly minQty: number;

  constructor(groupName: string, minQty: number) {
    super(`Selecione pelo menos ${minQty} em "${groupName}".`);
    this.groupName = groupName;
    this.minQty = minQty;
  }
}

export class InsufficientStockError extends DomainError {
  readonly code = 'INSUFFICIENT_STOCK';
  readonly productName: string;

  constructor(productName: string) {
    super(`Estoque insuficiente para "${productName}".`);
    this.productName = productName;
  }
}

export class TicketLimitReachedError extends DomainError {
  readonly code = 'TICKET_LIMIT_REACHED';

  constructor() {
    super('O limite de comandas foi atingido.');
  }
}

export class InvalidProductError extends DomainError {
  readonly code = 'INVALID_PRODUCT';
}

export class InvalidCustomizationError extends DomainError {
  readonly code = 'INVALID_CUSTOMIZATION';
}

export class InvalidCustomerError extends DomainError {
  readonly code = 'INVALID_CUSTOMER';
}

export class DuplicatePhoneError extends DomainError {
  readonly code = 'DUPLICATE_PHONE';

  constructor() {
    super('Já existe um cliente com esse telefone.');
  }
}

export class InvalidCashAmountError extends DomainError {
  readonly code = 'INVALID_CASH_AMOUNT';

  constructor() {
    super('Informe um valor válido.');
  }
}

export class InvalidCashMovementError extends DomainError {
  readonly code = 'INVALID_CASH_MOVEMENT';
}

export class NoOpenSessionError extends DomainError {
  readonly code = 'NO_OPEN_SESSION';

  constructor() {
    super('Não há caixa aberto.');
  }
}

export class SessionAlreadyOpenError extends DomainError {
  readonly code = 'SESSION_ALREADY_OPEN';

  constructor() {
    super('Já existe um caixa aberto.');
  }
}

export class MissingTicketError extends DomainError {
  readonly code = 'MISSING_TICKET';

  constructor() {
    super('Informe a comanda para registrar o pedido.');
  }
}

export class BusinessTypeNotSelectedError extends DomainError {
  readonly code = 'BUSINESS_TYPE_NOT_SELECTED';

  constructor() {
    super('Nenhum tipo de negócio foi selecionado.');
  }
}

export class UnknownBusinessTypeError extends DomainError {
  readonly code = 'UNKNOWN_BUSINESS_TYPE';
  readonly businessTypeId: string;

  constructor(businessTypeId: string) {
    super(`Tipo de negócio desconhecido: "${businessTypeId}".`);
    this.businessTypeId = businessTypeId;
  }
}

export class InvalidFinanceAmountError extends DomainError {
  readonly code = 'finance/invalid-amount';

  constructor() {
    super('Informe um valor válido maior que zero.');
  }
}

export class InvalidMonthError extends DomainError {
  readonly code = 'finance/invalid-month';
  readonly month: string;

  constructor(month: string) {
    super(`Mês inválido: "${month}".`);
    this.month = month;
  }
}

export class InvalidInstallmentCountError extends DomainError {
  readonly code = 'finance/invalid-installment-count';

  constructor() {
    super('Número de parcelas inválido para esse valor.');
  }
}

export class InvalidRecurrenceRangeError extends DomainError {
  readonly code = 'finance/invalid-recurrence-range';

  constructor() {
    super('O intervalo de meses da recorrência é inválido.');
  }
}

export class InvalidPercentError extends DomainError {
  readonly code = 'finance/invalid-percent';

  constructor() {
    super('Informe um percentual maior que zero.');
  }
}

export class EmptyMemberSelectionError extends DomainError {
  readonly code = 'finance/empty-member-selection';

  constructor() {
    super('Selecione pelo menos um membro.');
  }
}

export class FinanceCategoryInUseError extends DomainError {
  readonly code = 'finance/category-in-use';

  constructor() {
    super('A categoria está em uso e não pode ser excluída. Arquive-a.');
  }
}

export class FamilyMemberInUseError extends DomainError {
  readonly code = 'finance/member-in-use';

  constructor() {
    super('O membro está em uso e não pode ser excluído. Arquive-o.');
  }
}

export class DuplicateBudgetItemError extends DomainError {
  readonly code = 'finance/duplicate-budget-item';

  constructor() {
    super('Já existe um item de orçamento para essa categoria nesse mês.');
  }
}

export class MonthClosedError extends DomainError {
  readonly code = 'finance/month-closed';
  readonly month: string;

  constructor(month: string) {
    super(`O mês ${month} está fechado e não pode ser alterado.`);
    this.month = month;
  }
}

export class MonthAlreadyClosedError extends DomainError {
  readonly code = 'finance/month-already-closed';
  readonly month: string;

  constructor(month: string) {
    super(`O mês ${month} já está fechado.`);
    this.month = month;
  }
}

export class MonthNotClosedError extends DomainError {
  readonly code = 'finance/month-not-closed';
  readonly month: string;

  constructor(month: string) {
    super(`O mês ${month} não está fechado.`);
    this.month = month;
  }
}

export class RecurrenceOutOfRangeError extends DomainError {
  readonly code = 'finance/recurrence-out-of-range';

  constructor() {
    super('A recorrência não vale para esse mês.');
  }
}

export class RecurrenceAlreadyLaunchedError extends DomainError {
  readonly code = 'finance/recurrence-already-launched';

  constructor() {
    super('A recorrência já foi lançada nesse mês.');
  }
}

export class FormulaHasNoMatchesError extends DomainError {
  readonly code = 'finance/formula-has-no-matches';

  constructor() {
    super('Nenhum lançamento corresponde ao filtro da fórmula.');
  }
}

export class DerivedEntryDateLockedError extends DomainError {
  readonly code = 'finance/derived-entry-date-locked';

  constructor() {
    super(
      'A data de um lançamento gerado automaticamente não pode ser alterada.',
    );
  }
}

export class FinanceEntryNotFoundError extends DomainError {
  readonly code = 'finance/entry-not-found';

  constructor() {
    super('Lançamento não encontrado.');
  }
}

export class FamilyMemberNotFoundError extends DomainError {
  readonly code = 'finance/member-not-found';

  constructor() {
    super('Membro não encontrado.');
  }
}

export class FinanceCategoryNotFoundError extends DomainError {
  readonly code = 'finance/category-not-found';

  constructor() {
    super('Categoria não encontrada.');
  }
}

export class BudgetItemNotFoundError extends DomainError {
  readonly code = 'finance/budget-item-not-found';

  constructor() {
    super('Item de orçamento não encontrado.');
  }
}

export class FinanceFormulaNotFoundError extends DomainError {
  readonly code = 'finance/formula-not-found';

  constructor() {
    super('Fórmula não encontrada.');
  }
}

export class RecurrenceNotFoundError extends DomainError {
  readonly code = 'finance/recurrence-not-found';

  constructor() {
    super('Recorrência não encontrada.');
  }
}

export class InstallmentPlanNotFoundError extends DomainError {
  readonly code = 'finance/installment-plan-not-found';

  constructor() {
    super('Plano de parcelamento não encontrado.');
  }
}

export class LastModuleDisabledError extends DomainError {
  readonly code = 'modules/last-module-disabled';

  constructor() {
    super('Pelo menos um módulo precisa ficar ativo.');
  }
}

export class UnknownModuleError extends DomainError {
  readonly code = 'modules/unknown-module';
  readonly moduleId: string;

  constructor(moduleId: string) {
    super(`Módulo desconhecido: "${moduleId}".`);
    this.moduleId = moduleId;
  }
}

export class PaymentMethodNotFoundError extends DomainError {
  readonly code = 'finance/payment-method-not-found';

  constructor() {
    super('Meio de pagamento não encontrado.');
  }
}

export class PaymentMethodInUseError extends DomainError {
  readonly code = 'finance/payment-method-in-use';

  constructor() {
    super(
      'O meio de pagamento está em uso e não pode ser excluído. Arquive-o.',
    );
  }
}

export class InvalidCardDayError extends DomainError {
  readonly code = 'finance/invalid-card-day';

  constructor() {
    super('Informe dias de fechamento e vencimento entre 1 e 31.');
  }
}

export class InvoiceOverdetailedError extends DomainError {
  readonly code = 'finance/invoice-overdetailed';
  readonly excess: number;

  constructor(excess: number) {
    super(
      `Os lançamentos detalhados superam o valor da fatura em ${formatMoney(excess)}. Corrija os lançamentos antes de informar o valor.`,
    );
    this.excess = excess;
  }
}

export class InvoicePaidError extends DomainError {
  readonly code = 'finance/invoice-paid';

  constructor() {
    super('A fatura já foi paga e não pode ser alterada.');
  }
}

export class InvoiceNotFoundError extends DomainError {
  readonly code = 'finance/invoice-not-found';

  constructor() {
    super('Fatura não encontrada.');
  }
}

export class TabNotOpenError extends DomainError {
  readonly code = 'TAB_NOT_OPEN';

  constructor() {
    super('A comanda não está aberta.');
  }
}

export class EmptyTabError extends DomainError {
  readonly code = 'EMPTY_TAB';

  constructor() {
    super('A comanda não tem itens para fechar.');
  }
}

export class TabNotClosedError extends DomainError {
  readonly code = 'TAB_NOT_CLOSED';

  constructor() {
    super('Só é possível reabrir uma comanda fechada.');
  }
}

export class TabNotFoundError extends DomainError {
  readonly code = 'TAB_NOT_FOUND';

  constructor() {
    super('Comanda não encontrada.');
  }
}

export class PrinterUnavailableError extends DomainError {
  readonly code = 'PRINTER_UNAVAILABLE';

  constructor() {
    super('A impressora não está disponível neste dispositivo.');
  }
}

export class PrintFailedError extends DomainError {
  readonly code = 'PRINT_FAILED';

  constructor() {
    super('Não foi possível imprimir. Tente novamente.');
  }
}
