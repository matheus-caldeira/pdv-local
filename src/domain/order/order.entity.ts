export type OrderStage = 'aceito' | 'em_preparo' | 'a_caminho' | 'finalizado';

export type OrderStatus = 'open' | 'paid' | 'pending' | 'cancelled';

export interface OrderCustomizationItem {
  name: string;
  qty: number;
  price: number;
}

export interface OrderCustomization {
  groupName: string;
  items: OrderCustomizationItem[];
}

export interface OrderItem {
  productId: number;
  name: string;
  salePrice: number;
  costPrice: number;
  qty: number;
  observation?: string;
  customizations?: OrderCustomization[];
  customizationTotal?: number;
}

export interface Order {
  id?: number;
  sessionId: number;
  items: OrderItem[];
  total: number;
  paymentMethod: string | null;
  customerName: string;
  ticket: string;
  customerId?: number;
  customerPhone: string;
  stage: OrderStage;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
}

export type NewOrder = Omit<Order, 'id'>;
