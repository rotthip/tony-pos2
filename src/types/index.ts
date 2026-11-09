export type Language = 'th' | 'en';

export type Role = 'owner' | 'manager' | 'cashier' | 'kitchen';

export type Station = 'kitchen' | 'bar';

export type VatMode = 'none' | 'included' | 'excluded';

export type OrderType = 'dine-in' | 'takeaway';

export type OrderStatus = 'open' | 'paid' | 'void';

export type ItemStatus = 'new' | 'sent' | 'cooking' | 'ready' | 'served' | 'voided';

export type PaymentMethod = 'cash' | 'promptpay' | 'card' | 'other';

export interface ShopConfig {
  id: string;
  name: string;
  address: string;
  phone: string;
  taxId: string;
  vatMode: VatMode;
  vatRate: number; // typically 7%
  serviceChargeRate: number; // e.g. 0 or 10%
  promptPayId: string; // phone number (08x) or National ID (13 digits)
  promptPayName?: string;
  receiptHeader: string;
  receiptFooter: string;
  managerPinHash: string; // SHA-256
  ownerUid: string;
  printerPaperSize: '58mm' | '80mm';
}

export interface ModifierOption {
  id: string;
  nameTh: string;
  nameEn: string;
  priceDelta: number;
}

export interface ModifierGroup {
  id: string;
  nameTh: string;
  nameEn: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  options: ModifierOption[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  nameTh: string;
  nameEn: string;
  price: number;
  color?: string;
  emoji?: string;
  available: boolean;
  station: Station;
  modifierGroupIds: string[];
  sortOrder?: number;
}

export interface MenuCategory {
  id: string;
  nameTh: string;
  nameEn: string;
  emoji?: string;
  color?: string;
  sortOrder: number;
}

export interface MenuConfig {
  categories: MenuCategory[];
  items: MenuItem[];
  modifierGroups: ModifierGroup[];
}

export interface TableZone {
  id: string;
  nameTh: string;
  nameEn: string;
}

export interface RestaurantTable {
  id: string;
  name: string;
  zoneId: string;
  seats: number;
}

export interface TablesConfig {
  zones: TableZone[];
  tables: RestaurantTable[];
}

export interface SelectedModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceDelta: number;
}

export interface OrderItem {
  orderItemId: string; // unique ID in this order
  itemId: string;
  nameTh: string;
  nameEn: string;
  price: number; // base price
  qty: number;
  selectedModifiers: SelectedModifier[];
  note?: string;
  status: ItemStatus;
  station: Station;
  sentAt?: number;
  voidReason?: string;
  voidedBy?: string;
}

export interface PaymentRecord {
  id: string;
  method: PaymentMethod;
  amount: number;
  tenderedAmount?: number;
  change?: number;
  timestamp: number;
  refNumber?: string;
}

export interface OrderDiscount {
  type: 'percent' | 'amount';
  value: number; // e.g. 10 (%) or 50 (THB)
  amount: number; // calculated total discount amount
  reason?: string;
}

export interface Order {
  id: string;
  receiptNumber?: string;
  shopId: string;
  tableId: string | null; // null for takeaway
  tableName: string;
  type: OrderType;
  queueNumber: string; // e.g. "A01", "Q04"
  guestCount?: number;
  items: OrderItem[];
  subtotal: number;
  discount: OrderDiscount;
  serviceCharge: number;
  vat: number;
  total: number;
  status: OrderStatus;
  payments: PaymentRecord[];
  openedBy: string;
  openedByName?: string;
  shiftId: string;
  createdAt: number;
  updatedAt: number;
  paidAt?: number;
  voidReason?: string;
}

export interface CashMovement {
  id: string;
  type: 'pay_in' | 'pay_out';
  amount: number;
  note: string;
  timestamp: number;
  by: string;
}

export interface Shift {
  id: string;
  shopId: string;
  openedAt: number;
  openedBy: string;
  openedByName: string;
  openingCash: number;
  closedAt?: number;
  closedBy?: string;
  closedByName?: string;
  closingCash?: number;
  expectedCash?: number;
  difference?: number;
  cashMovements: CashMovement[];
  status: 'open' | 'closed';
  summary?: {
    cashSales: number;
    promptPaySales: number;
    cardSales: number;
    otherSales: number;
    totalSales: number;
    billCount: number;
  };
}

export interface DailySummary {
  date: string; // yyyy-MM-dd
  salesTotal: number;
  billCount: number;
  paymentTotals: {
    cash: number;
    promptpay: number;
    card: number;
    other: number;
  };
  topItems: Record<string, { nameTh: string; nameEn: string; qty: number; total: number }>;
  voidCount: number;
  voidAmount: number;
  discountTotal: number;
  serviceChargeTotal: number;
  vatTotal: number;
}

export interface UserMember {
  uid: string;
  name: string;
  email: string;
  role: Role;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  currentStock: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface StockItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minThreshold: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  note?: string;
  date: string;
  createdAt?: any;
  updatedAt?: any;
}
