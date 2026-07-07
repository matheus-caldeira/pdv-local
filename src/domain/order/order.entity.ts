export type OrderStage = 'aceito' | 'em_preparo' | 'a_caminho' | 'finalizado';

export type OrderStatus = 'open' | 'paid' | 'pending' | 'cancelled';

export interface OrderCustomizationItem {
  groupName: string;
  name: string;
  qty: number;
  price: number;
}

export interface OrderItem {
  productUid?: string;
  name: string;
  salePrice: number;
  costPrice: number;
  qty: number;
  observation?: string;
  customizations?: OrderCustomizationItem[];
  customizationTotal?: number;
}

export interface Order {
  id?: number;
  uid: string;
  businessTypeId: string;
  sessionUid: string;
  customerUid?: string;
  items: OrderItem[];
  total: number;
  paymentMethod: string | null;
  customerName: string;
  customerPhone: string;
  ticket: string;
  stage: OrderStage;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
}

export type NewOrder = Omit<Order, 'id'>;
