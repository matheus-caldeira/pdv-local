import type { OrderRepository } from '../order/order.repository';
import type { CustomerRepository } from '../customer/customer.repository';
import type { ProductRepository } from '../product/product.repository';
import type { ConfigRepository } from '../config/config.repository';
import type { CustomizationRepository } from '../customization/customization.repository';
import type { CashRepository } from '../cash/cash.repository';

export interface Repositories {
  orders: OrderRepository;
  customers: CustomerRepository;
  products: ProductRepository;
  config: ConfigRepository;
  customizations: CustomizationRepository;
  cash: CashRepository;
}
