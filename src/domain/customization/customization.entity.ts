export interface CustomizationGroup {
  id?: number;
  uid: string;
  name: string;
  required: boolean;
  minQty: number;
  maxQty: number;
  chargeAfter: number;
}

export interface CustomizationItem {
  id?: number;
  uid: string;
  groupUid: string;
  name: string;
  price: number;
  maxQty: number;
  chargeAfter: number;
  active: boolean;
}

export type NewCustomizationGroup = Omit<CustomizationGroup, 'id'>;
export type NewCustomizationItem = Omit<CustomizationItem, 'id'>;
