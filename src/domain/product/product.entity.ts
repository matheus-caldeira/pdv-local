export interface Product {
  id?: number;
  name: string;
  category: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  active: boolean;
  customizationGroupIds: number[];
  createdAt: number;
  updatedAt: number;
}
