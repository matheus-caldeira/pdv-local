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
