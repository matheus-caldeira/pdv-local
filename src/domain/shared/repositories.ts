import type { OrderRepository } from '../order/order.repository';
import type { CustomerRepository } from '../customer/customer.repository';
import type { ProductRepository } from '../product/product.repository';
import type { ConfigRepository } from '../config/config.repository';
import type { CustomizationRepository } from '../customization/customization.repository';
import type { CashRepository } from '../cash/cash.repository';
import type { FinanceEntryRepository } from '../finance/finance-entry.repository';
import type { FinanceAutomationRepository } from '../finance/finance-automation.repository';
import type { FinanceClosingRepository } from '../finance/finance-closing.repository';

export interface Repositories {
  orders: OrderRepository;
  customers: CustomerRepository;
  products: ProductRepository;
  config: ConfigRepository;
  customizations: CustomizationRepository;
  cash: CashRepository;
  financeEntries: FinanceEntryRepository;
  financeAutomations: FinanceAutomationRepository;
  financeClosings: FinanceClosingRepository;
}
