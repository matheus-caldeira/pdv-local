import { AppError, type ErrorLayer } from './shared/errors';

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
