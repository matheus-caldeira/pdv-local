export interface Product {
  id?: number;
  uid: string;
  name: string;
  category: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  tracksStock: boolean;
  active: boolean;
  customizationGroupIds: number[];
  createdAt: number;
  updatedAt: number;
}

export type NewProduct = Omit<Product, 'id'>;
