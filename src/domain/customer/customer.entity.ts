export interface Customer {
  id?: number;
  uid: string;
  name: string;
  phone?: string;
  addresses: string[];
  extra: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}
