import { describe, expect, it } from 'vitest';
import { AppError } from './shared/errors';
import {
  BudgetItemNotFoundError,
  BusinessTypeNotSelectedError,
  DerivedEntryDateLockedError,
  DomainError,
  DuplicateBudgetItemError,
  EmptyCartError,
  EmptyMemberSelectionError,
  FamilyMemberInUseError,
  FamilyMemberNotFoundError,
  FinanceCategoryInUseError,
  FinanceCategoryNotFoundError,
  FinanceEntryNotFoundError,
  FinanceFormulaNotFoundError,
  FormulaHasNoMatchesError,
  InstallmentPlanNotFoundError,
  InsufficientStockError,
  InvalidCardDayError,
  InvalidFinanceAmountError,
  InvalidInstallmentCountError,
  InvalidMonthError,
  InvalidPercentError,
  InvalidRecurrenceRangeError,
  InvoiceOverdetailedError,
  InvoicePaidError,
  MissingTicketError,
  MonthAlreadyClosedError,
  MonthClosedError,
  MonthNotClosedError,
  PaymentMethodInUseError,
  PaymentMethodNotFoundError,
  RecurrenceAlreadyLaunchedError,
  RecurrenceNotFoundError,
  RecurrenceOutOfRangeError,
  RequiredCustomizationMissingError,
  TabNotFoundError,
  TicketLimitReachedError,
  UnknownBusinessTypeError,
} from './errors';

describe('domain errors', () => {
  it('EmptyCartError carries its code and layer', () => {
    const error = new EmptyCartError();
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe('EMPTY_CART');
    expect(error.layer).toBe('domain');
    expect(error.message).toContain('vazio');
  });

  it('RequiredCustomizationMissingError exposes group and minimum', () => {
    const error = new RequiredCustomizationMissingError('Ponto', 2);
    expect(error.code).toBe('REQUIRED_CUSTOMIZATION_MISSING');
    expect(error.groupName).toBe('Ponto');
    expect(error.minQty).toBe(2);
    expect(error.message).toContain('Ponto');
  });

  it('InsufficientStockError names the product', () => {
    const error = new InsufficientStockError('X-Burger');
    expect(error.code).toBe('INSUFFICIENT_STOCK');
    expect(error.productName).toBe('X-Burger');
    expect(error.message).toContain('X-Burger');
  });

  it('TicketLimitReachedError carries its code', () => {
    const error = new TicketLimitReachedError();
    expect(error.code).toBe('TICKET_LIMIT_REACHED');
    expect(error.message).toContain('limite');
  });

  it('TabNotFoundError carries its code', () => {
    const error = new TabNotFoundError();
    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe('TAB_NOT_FOUND');
    expect(error.message).toContain('não encontrada');
  });
});

describe('erros de tipo de negócio', () => {
  it('MissingTicketError', () => {
    const e = new MissingTicketError();
    expect(e.code).toBe('MISSING_TICKET');
    expect(e.layer).toBe('domain');
  });
  it('BusinessTypeNotSelectedError', () => {
    const e = new BusinessTypeNotSelectedError();
    expect(e.code).toBe('BUSINESS_TYPE_NOT_SELECTED');
    expect(e.layer).toBe('domain');
  });
  it('UnknownBusinessTypeError guarda o id', () => {
    const e = new UnknownBusinessTypeError('xyz');
    expect(e.code).toBe('UNKNOWN_BUSINESS_TYPE');
    expect(e.businessTypeId).toBe('xyz');
  });
});

describe('erros do financeiro', () => {
  it('InvalidFinanceAmountError', () => {
    const e = new InvalidFinanceAmountError();
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('finance/invalid-amount');
    expect(e.layer).toBe('domain');
    expect(e.message).toContain('valor válido');
  });

  it('InvalidMonthError guarda o mês', () => {
    const e = new InvalidMonthError('2026-13');
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('finance/invalid-month');
    expect(e.month).toBe('2026-13');
    expect(e.message).toContain('2026-13');
  });

  it('InvalidInstallmentCountError', () => {
    const e = new InvalidInstallmentCountError();
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('finance/invalid-installment-count');
    expect(e.message).toContain('parcelas');
  });

  it('InvalidRecurrenceRangeError', () => {
    const e = new InvalidRecurrenceRangeError();
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('finance/invalid-recurrence-range');
    expect(e.message).toContain('recorrência');
  });

  it('InvalidPercentError', () => {
    const e = new InvalidPercentError();
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('finance/invalid-percent');
    expect(e.message).toContain('percentual');
  });

  it('EmptyMemberSelectionError', () => {
    const e = new EmptyMemberSelectionError();
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('finance/empty-member-selection');
    expect(e.message).toContain('membro');
  });

  it('FinanceCategoryInUseError', () => {
    const e = new FinanceCategoryInUseError();
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('finance/category-in-use');
    expect(e.message).toContain('em uso');
  });

  it('FamilyMemberInUseError', () => {
    const e = new FamilyMemberInUseError();
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('finance/member-in-use');
    expect(e.message).toContain('em uso');
  });

  it('DuplicateBudgetItemError', () => {
    const e = new DuplicateBudgetItemError();
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('finance/duplicate-budget-item');
    expect(e.message).toContain('orçamento');
  });

  it('MonthClosedError guarda o mês', () => {
    const e = new MonthClosedError('2026-06');
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('finance/month-closed');
    expect(e.month).toBe('2026-06');
    expect(e.message).toContain('2026-06');
  });

  it('MonthAlreadyClosedError guarda o mês', () => {
    const e = new MonthAlreadyClosedError('2026-06');
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('finance/month-already-closed');
    expect(e.month).toBe('2026-06');
    expect(e.message).toContain('já está fechado');
  });

  it('MonthNotClosedError guarda o mês', () => {
    const e = new MonthNotClosedError('2026-06');
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('finance/month-not-closed');
    expect(e.month).toBe('2026-06');
    expect(e.message).toContain('não está fechado');
  });

  it('RecurrenceOutOfRangeError', () => {
    const e = new RecurrenceOutOfRangeError();
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('finance/recurrence-out-of-range');
    expect(e.message).toContain('recorrência');
  });

  it('RecurrenceAlreadyLaunchedError', () => {
    const e = new RecurrenceAlreadyLaunchedError();
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('finance/recurrence-already-launched');
    expect(e.message).toContain('já foi lançada');
  });

  it('FormulaHasNoMatchesError', () => {
    const e = new FormulaHasNoMatchesError();
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('finance/formula-has-no-matches');
    expect(e.message).toContain('Nenhum lançamento');
  });

  it('DerivedEntryDateLockedError', () => {
    const e = new DerivedEntryDateLockedError();
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('finance/derived-entry-date-locked');
    expect(e.message).toContain('data');
  });

  it('FinanceEntryNotFoundError', () => {
    const e = new FinanceEntryNotFoundError();
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('finance/entry-not-found');
    expect(e.message).toContain('Lançamento não encontrado');
  });

  it('FamilyMemberNotFoundError', () => {
    const e = new FamilyMemberNotFoundError();
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('finance/member-not-found');
    expect(e.message).toContain('Membro não encontrado');
  });

  it('FinanceCategoryNotFoundError', () => {
    const e = new FinanceCategoryNotFoundError();
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('finance/category-not-found');
    expect(e.message).toContain('Categoria não encontrada');
  });

  it('BudgetItemNotFoundError', () => {
    const e = new BudgetItemNotFoundError();
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('finance/budget-item-not-found');
    expect(e.message).toContain('Item de orçamento não encontrado');
  });

  it('FinanceFormulaNotFoundError', () => {
    const e = new FinanceFormulaNotFoundError();
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('finance/formula-not-found');
    expect(e.message).toContain('Fórmula não encontrada');
  });

  it('RecurrenceNotFoundError', () => {
    const e = new RecurrenceNotFoundError();
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('finance/recurrence-not-found');
    expect(e.message).toContain('Recorrência não encontrada');
  });

  it('InstallmentPlanNotFoundError', () => {
    const e = new InstallmentPlanNotFoundError();
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('finance/installment-plan-not-found');
    expect(e.message).toContain('Plano de parcelamento não encontrado');
  });

  it('PaymentMethodNotFoundError', () => {
    const e = new PaymentMethodNotFoundError();
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('finance/payment-method-not-found');
    expect(e.message).toContain('Meio de pagamento não encontrado');
  });

  it('PaymentMethodInUseError', () => {
    const e = new PaymentMethodInUseError();
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('finance/payment-method-in-use');
    expect(e.message).toContain('em uso');
  });

  it('InvalidCardDayError', () => {
    const e = new InvalidCardDayError();
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('finance/invalid-card-day');
    expect(e.message).toContain('fechamento');
  });

  it('InvoiceOverdetailedError guarda o excesso', () => {
    const e = new InvoiceOverdetailedError(150.5);
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('finance/invoice-overdetailed');
    expect(e.excess).toBe(150.5);
    expect(e.message).toContain('superam');
  });

  it('InvoicePaidError', () => {
    const e = new InvoicePaidError();
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('finance/invoice-paid');
    expect(e.message).toContain('já foi paga');
  });
});
