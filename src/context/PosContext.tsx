import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ShopConfig,
  TablesConfig,
  MenuConfig,
  Order,
  OrderItem,
  Shift,
  DailySummary,
  Role,
  Language,
  PaymentRecord,
  OrderDiscount,
  Station,
  ItemStatus,
} from '../types';
import {
  INITIAL_SHOP_CONFIG,
  INITIAL_TABLES_CONFIG,
  INITIAL_MENU_CONFIG,
} from '../data/seedData';
import {
  initFirebase,
  isExplicitDemoMode,
  setExplicitDemoMode,
  saveStoredFirebaseConfig,
  getStoredFirebaseConfig,
  type FirebaseClientConfig,
} from '../firebaseConfig';
import { hashPin, DEFAULT_DEMO_PIN_HASH } from '../utils/hash';
import { sound } from '../utils/audio';

// Local storage keys
const LS_SHOP = 'sabaipos_shop_config_v1';
const LS_TABLES = 'sabaipos_tables_config_v1';
const LS_MENU = 'sabaipos_menu_config_v1';
const LS_ORDERS = 'sabaipos_orders_v1';
const LS_SHIFTS = 'sabaipos_shifts_v1';
const LS_DAILY = 'sabaipos_daily_summaries_v1';
const LS_ROLE = 'sabaipos_active_role_v1';
const LS_LANG = 'sabaipos_language_v1';
const LS_THEME = 'sabaipos_theme_v1';
const LS_QUEUE_SEQ = 'sabaipos_queue_seq_v1';
const LS_REC_SEQ = 'sabaipos_receipt_seq_v1';

interface PosContextType {
  // Configs
  shopConfig: ShopConfig;
  tablesConfig: TablesConfig;
  menuConfig: MenuConfig;
  updateShopConfig: (cfg: Partial<ShopConfig>) => void;
  updateMenuConfig: (cfg: Partial<MenuConfig>) => void;
  updateTablesConfig: (cfg: Partial<TablesConfig>) => void;
  resetDemoData: () => void;

  // Mode & Offline
  isDemoMode: boolean;
  toggleDemoMode: (enabled: boolean) => void;
  isOnline: boolean;
  pendingSyncCount: number;
  firebaseConfig: FirebaseClientConfig;
  saveFirebaseSettings: (cfg: FirebaseClientConfig) => void;

  // User & Auth
  currentRole: Role;
  setCurrentRole: (role: Role) => void;
  currentUserName: string;
  verifyManagerPin: (pin: string) => Promise<boolean>;
  changeManagerPin: (newPin: string) => Promise<void>;

  // Language & Theme
  language: Language;
  setLanguage: (lang: Language) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Active Shifts
  currentShift: Shift | null;
  openShift: (openingCash: number) => Shift;
  closeShift: (closingCash: number) => { shift: Shift; expectedCash: number; difference: number };
  recordCashMovement: (type: 'pay_in' | 'pay_out', amount: number, note: string) => void;

  // Orders
  orders: Order[];
  activeOrder: Order | null;
  setActiveOrderById: (orderId: string | null) => void;
  createDineInOrder: (tableId: string, guestCount?: number) => Order;
  createTakeawayOrder: () => Order;
  addItemToOrder: (
    orderId: string,
    item: {
      itemId: string;
      nameTh: string;
      nameEn: string;
      price: number;
      qty: number;
      station: Station;
      selectedModifiers: OrderItem['selectedModifiers'];
      note?: string;
    }
  ) => void;
  updateOrderItemQty: (orderId: string, orderItemId: string, newQty: number) => void;
  sendOrderToKitchen: (orderId: string) => void;
  updateItemStatus: (orderId: string, orderItemId: string, status: ItemStatus) => void;
  markTicketReady: (orderId: string, station?: Station) => void;
  voidItem: (orderId: string, orderItemId: string, reason: string) => Promise<boolean>;
  voidEntireOrder: (orderId: string, reason: string) => Promise<boolean>;
  moveTable: (orderId: string, targetTableId: string) => boolean;
  mergeOrders: (sourceOrderId: string, targetOrderId: string) => boolean;
  applyOrderDiscount: (orderId: string, discount: OrderDiscount) => void;
  processPayment: (
    orderId: string,
    payments: PaymentRecord[]
  ) => { order: Order; receiptNumber: string };

  // Daily Summaries & Reports
  dailySummaries: Record<string, DailySummary>;
  getDailySummary: (dateStr: string) => DailySummary;
}

const PosContext = createContext<PosContextType | null>(null);

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const PosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // System states
  const [isDemoMode, setIsDemoMode] = useState<boolean>(isExplicitDemoMode);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingSyncCount] = useState<number>(0);
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem(LS_LANG) as Language) || 'th';
  });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem(LS_THEME) === 'dark';
  });

  // Shop & Config
  const [shopConfig, setShopConfig] = useState<ShopConfig>(() => {
    const raw = localStorage.getItem(LS_SHOP);
    if (raw) {
      try { return JSON.parse(raw); } catch {}
    }
    return INITIAL_SHOP_CONFIG;
  });

  const [tablesConfig, setTablesConfig] = useState<TablesConfig>(() => {
    const raw = localStorage.getItem(LS_TABLES);
    if (raw) {
      try { return JSON.parse(raw); } catch {}
    }
    return INITIAL_TABLES_CONFIG;
  });

  const [menuConfig, setMenuConfig] = useState<MenuConfig>(() => {
    const raw = localStorage.getItem(LS_MENU);
    if (raw) {
      try { return JSON.parse(raw); } catch {}
    }
    return INITIAL_MENU_CONFIG;
  });

  // User & Roles
  const [currentRole, setCurrentRoleState] = useState<Role>(() => {
    return (localStorage.getItem(LS_ROLE) as Role) || 'cashier';
  });
  const currentUserName = currentRole === 'owner' ? 'สมชาย (เจ้าของร้าน)' : currentRole === 'manager' ? 'วิภา (ผู้จัดการ)' : currentRole === 'kitchen' ? 'เชฟชัย (หัวหน้าครัว)' : 'นารี (แคชเชียร์)';

  // Shifts
  const [shifts, setShifts] = useState<Shift[]>(() => {
    const raw = localStorage.getItem(LS_SHIFTS);
    if (raw) {
      try { return JSON.parse(raw); } catch {}
    }
    // Pre-seed an initial open shift so user can start testing immediately
    const initialShift: Shift = {
      id: 'shift_' + Date.now(),
      shopId: INITIAL_SHOP_CONFIG.id,
      openedAt: Date.now() - 3600000 * 3, // 3 hours ago
      openedBy: 'user_cashier',
      openedByName: 'นารี (แคชเชียร์)',
      openingCash: 2000,
      cashMovements: [],
      status: 'open',
    };
    return [initialShift];
  });

  // Orders
  const [orders, setOrders] = useState<Order[]>(() => {
    const raw = localStorage.getItem(LS_ORDERS);
    if (raw) {
      try { return JSON.parse(raw); } catch {}
    }
    // Seed initial orders to show table statuses and KDS immediately
    const now = Date.now();
    const demoOrders: Order[] = [
      {
        id: 'ord_demo_01',
        shopId: INITIAL_SHOP_CONFIG.id,
        tableId: 't_02',
        tableName: 'T02',
        type: 'dine-in',
        queueNumber: 'D01',
        guestCount: 3,
        items: [
          {
            orderItemId: 'item_o_1',
            itemId: 'item_kaprao_crispy_pork',
            nameTh: 'ข้าวกะเพราหมูกรอบคั่วพริกแห้ง',
            nameEn: 'Stir-Fried Holy Basil Crispy Pork',
            price: 95,
            qty: 2,
            selectedModifiers: [
              { groupId: 'mod_spicy_level', groupName: 'ระดับความเผ็ด', optionId: 'spicy_normal', optionName: 'เผ็ดปกติ', priceDelta: 0 },
              { groupId: 'mod_egg', groupName: 'เพิ่มไข่', optionId: 'egg_fried', optionName: 'ไข่ดาวกรอบ', priceDelta: 15 },
            ],
            status: 'cooking',
            station: 'kitchen',
            sentAt: now - 1000 * 60 * 12, // 12 mins ago
          },
          {
            orderItemId: 'item_o_2',
            itemId: 'item_thai_tea_slurpee',
            nameTh: 'ชาไทยสเลอปี้เข้มข้น',
            nameEn: 'Signature Thai Milk Tea Slurpee',
            price: 75,
            qty: 2,
            selectedModifiers: [
              { groupId: 'mod_sweetness', groupName: 'ระดับความหวาน', optionId: 'sweet_50', optionName: 'หวานน้อย (50%)', priceDelta: 0 },
            ],
            status: 'ready',
            station: 'bar',
            sentAt: now - 1000 * 60 * 10,
          },
        ],
        subtotal: 370,
        discount: { type: 'percent', value: 0, amount: 0 },
        serviceCharge: 0,
        vat: 24.21,
        total: 370,
        status: 'open',
        payments: [],
        openedBy: 'cashier',
        openedByName: 'นารี (แคชเชียร์)',
        shiftId: 'shift_default',
        createdAt: now - 1000 * 60 * 15,
        updatedAt: now - 1000 * 60 * 10,
      },
      {
        id: 'ord_demo_02',
        shopId: INITIAL_SHOP_CONFIG.id,
        tableId: 't_04',
        tableName: 'T04',
        type: 'dine-in',
        queueNumber: 'D02',
        guestCount: 4,
        items: [
          {
            orderItemId: 'item_o_3',
            itemId: 'item_pad_thai_kung',
            nameTh: 'ผัดไทยกุ้งสดแม่น้ำสูตรโบราณ',
            nameEn: 'Traditional River Prawn Pad Thai',
            price: 139,
            qty: 2,
            selectedModifiers: [],
            status: 'sent',
            station: 'kitchen',
            sentAt: now - 1000 * 60 * 4,
          },
          {
            orderItemId: 'item_o_4',
            itemId: 'item_es_yen',
            nameTh: 'เอสเพรสโซ่เย็นสูตรไทยเข้มข้น (Es Yen)',
            nameEn: 'Thai Style Iced Espresso (Es Yen)',
            price: 65,
            qty: 2,
            selectedModifiers: [
              { groupId: 'mod_sweetness', groupName: 'ระดับความหวาน', optionId: 'sweet_100', optionName: 'หวานปกติ (100%)', priceDelta: 0 },
            ],
            status: 'sent',
            station: 'bar',
            sentAt: now - 1000 * 60 * 4,
          },
        ],
        subtotal: 408,
        discount: { type: 'percent', value: 0, amount: 0 },
        serviceCharge: 0,
        vat: 26.69,
        total: 408,
        status: 'open',
        payments: [],
        openedBy: 'cashier',
        shiftId: 'shift_default',
        createdAt: now - 1000 * 60 * 5,
        updatedAt: now - 1000 * 60 * 4,
      },
      {
        id: 'ord_demo_03',
        shopId: INITIAL_SHOP_CONFIG.id,
        tableId: null,
        tableName: 'Takeaway A01',
        type: 'takeaway',
        queueNumber: 'A01',
        guestCount: 1,
        items: [
          {
            orderItemId: 'item_o_5',
            itemId: 'item_fried_rice_crab',
            nameTh: 'ข้าวผัดปูก้อนเนื้อแน่น',
            nameEn: 'Crab Meat Fried Rice',
            price: 150,
            qty: 1,
            selectedModifiers: [
              { groupId: 'mod_egg', groupName: 'เพิ่มไข่', optionId: 'egg_fried', optionName: 'ไข่ดาวกรอบ', priceDelta: 15 },
            ],
            note: 'ไม่ใส่ต้นหอม',
            status: 'cooking',
            station: 'kitchen',
            sentAt: now - 1000 * 60 * 6,
          },
        ],
        subtotal: 165,
        discount: { type: 'percent', value: 0, amount: 0 },
        serviceCharge: 0,
        vat: 10.79,
        total: 165,
        status: 'open',
        payments: [],
        openedBy: 'cashier',
        shiftId: 'shift_default',
        createdAt: now - 1000 * 60 * 7,
        updatedAt: now - 1000 * 60 * 6,
      },
    ];
    return demoOrders;
  });

  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  // Daily summary
  const [dailySummaries, setDailySummaries] = useState<Record<string, DailySummary>>(() => {
    const raw = localStorage.getItem(LS_DAILY);
    if (raw) {
      try { return JSON.parse(raw); } catch {}
    }
    const today = getTodayString();
    return {
      [today]: {
        date: today,
        salesTotal: 4890,
        billCount: 18,
        paymentTotals: {
          cash: 2150,
          promptpay: 2340,
          card: 400,
          other: 0,
        },
        topItems: {
          item_kaprao_crispy_pork: { nameTh: 'ข้าวกะเพราหมูกรอบคั่วพริกแห้ง', nameEn: 'Basil Crispy Pork', qty: 24, total: 2280 },
          item_thai_tea_slurpee: { nameTh: 'ชาไทยสเลอปี้เข้มข้น', nameEn: 'Thai Tea Slurpee', qty: 19, total: 1425 },
          item_pad_thai_kung: { nameTh: 'ผัดไทยกุ้งสดแม่น้ำ', nameEn: 'River Prawn Pad Thai', qty: 11, total: 1529 },
          item_es_yen: { nameTh: 'เอสเพรสโซ่เย็นสูตรไทย', nameEn: 'Thai Iced Espresso', qty: 14, total: 910 },
        },
        voidCount: 1,
        voidAmount: 95,
        discountTotal: 150,
        serviceChargeTotal: 0,
        vatTotal: 319.91,
      },
    };
  });

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(LS_SHOP, JSON.stringify(shopConfig));
  }, [shopConfig]);

  useEffect(() => {
    localStorage.setItem(LS_TABLES, JSON.stringify(tablesConfig));
  }, [tablesConfig]);

  useEffect(() => {
    localStorage.setItem(LS_MENU, JSON.stringify(menuConfig));
  }, [menuConfig]);

  useEffect(() => {
    localStorage.setItem(LS_ORDERS, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(LS_SHIFTS, JSON.stringify(shifts));
  }, [shifts]);

  useEffect(() => {
    localStorage.setItem(LS_DAILY, JSON.stringify(dailySummaries));
  }, [dailySummaries]);

  // Online / Offline listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    initFirebase();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const setCurrentRole = useCallback((role: Role) => {
    setCurrentRoleState(role);
    localStorage.setItem(LS_ROLE, role);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LS_LANG, lang);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem(LS_THEME, next ? 'dark' : 'light');
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  }, []);

  // Set html dark class initially
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDemoMode = useCallback((enabled: boolean) => {
    setIsDemoMode(enabled);
    setExplicitDemoMode(enabled);
  }, []);

  const saveFirebaseSettings = useCallback((cfg: FirebaseClientConfig) => {
    saveStoredFirebaseConfig(cfg);
  }, []);

  const updateShopConfig = useCallback((cfg: Partial<ShopConfig>) => {
    setShopConfig((prev) => ({ ...prev, ...cfg }));
  }, []);

  const updateMenuConfig = useCallback((cfg: Partial<MenuConfig>) => {
    setMenuConfig((prev) => ({ ...prev, ...cfg }));
  }, []);

  const updateTablesConfig = useCallback((cfg: Partial<TablesConfig>) => {
    setTablesConfig((prev) => ({ ...prev, ...cfg }));
  }, []);

  const resetDemoData = useCallback(() => {
    setShopConfig(INITIAL_SHOP_CONFIG);
    setTablesConfig(INITIAL_TABLES_CONFIG);
    setMenuConfig(INITIAL_MENU_CONFIG);
  }, []);

  // Manager PIN verification
  const verifyManagerPin = useCallback(async (pin: string): Promise<boolean> => {
    // Default demo PIN: 1234
    if (pin === '1234') return true;
    const hashed = await hashPin(pin);
    return hashed === shopConfig.managerPinHash || shopConfig.managerPinHash === DEFAULT_DEMO_PIN_HASH;
  }, [shopConfig.managerPinHash]);

  const changeManagerPin = useCallback(async (newPin: string) => {
    const hashed = await hashPin(newPin);
    updateShopConfig({ managerPinHash: hashed });
  }, [updateShopConfig]);

  // Shifts
  const currentShift = shifts.find((s) => s.status === 'open') || null;

  const openShift = useCallback((openingCash: number): Shift => {
    const newShift: Shift = {
      id: 'shift_' + Date.now(),
      shopId: shopConfig.id,
      openedAt: Date.now(),
      openedBy: currentRole,
      openedByName: currentUserName,
      openingCash,
      cashMovements: [],
      status: 'open',
    };
    setShifts((prev) => [newShift, ...prev]);
    return newShift;
  }, [shopConfig.id, currentRole, currentUserName]);

  const closeShift = useCallback((closingCash: number) => {
    if (!currentShift) throw new Error('No open shift to close');

    // Calculate cash sales from paid orders in this shift
    const shiftOrders = orders.filter((o) => o.shiftId === currentShift.id && o.status === 'paid');
    let cashSales = 0;
    let promptPaySales = 0;
    let cardSales = 0;
    let otherSales = 0;

    shiftOrders.forEach((o) => {
      o.payments.forEach((p) => {
        if (p.method === 'cash') cashSales += p.amount;
        if (p.method === 'promptpay') promptPaySales += p.amount;
        if (p.method === 'card') cardSales += p.amount;
        if (p.method === 'other') otherSales += p.amount;
      });
    });

    const netPayMovements = currentShift.cashMovements.reduce((acc, m) => {
      return m.type === 'pay_in' ? acc + m.amount : acc - m.amount;
    }, 0);

    const expectedCash = currentShift.openingCash + cashSales + netPayMovements;
    const difference = closingCash - expectedCash;

    const closedShift: Shift = {
      ...currentShift,
      closedAt: Date.now(),
      closedBy: currentRole,
      closedByName: currentUserName,
      closingCash,
      expectedCash,
      difference,
      status: 'closed',
      summary: {
        cashSales,
        promptPaySales,
        cardSales,
        otherSales,
        totalSales: cashSales + promptPaySales + cardSales + otherSales,
        billCount: shiftOrders.length,
      },
    };

    setShifts((prev) => prev.map((s) => (s.id === currentShift.id ? closedShift : s)));
    return { shift: closedShift, expectedCash, difference };
  }, [currentShift, orders, currentRole, currentUserName]);

  const recordCashMovement = useCallback((type: 'pay_in' | 'pay_out', amount: number, note: string) => {
    if (!currentShift) return;
    const movement = {
      id: 'mov_' + Date.now(),
      type,
      amount,
      note,
      timestamp: Date.now(),
      by: currentUserName,
    };
    setShifts((prev) =>
      prev.map((s) =>
        s.id === currentShift.id
          ? { ...s, cashMovements: [movement, ...s.cashMovements] }
          : s
      )
    );
  }, [currentShift, currentUserName]);

  // Order helpers
  const calculateTotals = useCallback((items: OrderItem[], discount: OrderDiscount, vatMode: ShopConfig['vatMode'], vatRate: number, serviceChargeRate: number) => {
    // Only non-voided items count towards totals
    const activeItems = items.filter((i) => i.status !== 'voided');

    const subtotal = activeItems.reduce((acc, item) => {
      const modifierSum = item.selectedModifiers.reduce((mAcc, m) => mAcc + m.priceDelta, 0);
      return acc + (item.price + modifierSum) * item.qty;
    }, 0);

    let discountAmount = 0;
    if (discount.type === 'percent') {
      discountAmount = (subtotal * discount.value) / 100;
    } else {
      discountAmount = Math.min(discount.value, subtotal);
    }
    const afterDiscount = Math.max(0, subtotal - discountAmount);

    const serviceCharge = serviceChargeRate > 0 ? (afterDiscount * serviceChargeRate) / 100 : 0;
    const taxableAmount = afterDiscount + serviceCharge;

    let vat = 0;
    let total = 0;

    if (vatMode === 'included') {
      // VAT is already included in the prices
      vat = (taxableAmount * vatRate) / (100 + vatRate);
      total = taxableAmount;
    } else if (vatMode === 'excluded') {
      // VAT is added on top
      vat = (taxableAmount * vatRate) / 100;
      total = taxableAmount + vat;
    } else {
      // None
      vat = 0;
      total = taxableAmount;
    }

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      serviceCharge: Math.round(serviceCharge * 100) / 100,
      vat: Math.round(vat * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }, []);

  const createDineInOrder = useCallback((tableId: string, guestCount: number = 2): Order => {
    const table = tablesConfig.tables.find((t) => t.id === tableId);
    const tableName = table ? table.name : `โต๊ะ ${tableId}`;

    // Check if open order already exists for this table
    const existing = orders.find((o) => o.tableId === tableId && o.status === 'open');
    if (existing) {
      setActiveOrderId(existing.id);
      return existing;
    }

    const nextSeq = Number(localStorage.getItem(LS_QUEUE_SEQ) || '1');
    localStorage.setItem(LS_QUEUE_SEQ, String(nextSeq + 1));
    const queueNumber = `D${String(nextSeq).padStart(2, '0')}`;

    const newOrder: Order = {
      id: 'ord_' + Date.now(),
      shopId: shopConfig.id,
      tableId,
      tableName,
      type: 'dine-in',
      queueNumber,
      guestCount,
      items: [],
      subtotal: 0,
      discount: { type: 'percent', value: 0, amount: 0 },
      serviceCharge: 0,
      vat: 0,
      total: 0,
      status: 'open',
      payments: [],
      openedBy: currentRole,
      openedByName: currentUserName,
      shiftId: currentShift ? currentShift.id : 'shift_default',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setOrders((prev) => [newOrder, ...prev]);
    setActiveOrderId(newOrder.id);
    return newOrder;
  }, [tablesConfig.tables, orders, shopConfig.id, currentRole, currentUserName, currentShift]);

  const createTakeawayOrder = useCallback((): Order => {
    const nextSeq = Number(localStorage.getItem(LS_QUEUE_SEQ) || '1');
    localStorage.setItem(LS_QUEUE_SEQ, String(nextSeq + 1));
    const queueNumber = `A${String(nextSeq).padStart(2, '0')}`;

    const newOrder: Order = {
      id: 'ord_' + Date.now(),
      shopId: shopConfig.id,
      tableId: null,
      tableName: `Takeaway ${queueNumber}`,
      type: 'takeaway',
      queueNumber,
      guestCount: 1,
      items: [],
      subtotal: 0,
      discount: { type: 'percent', value: 0, amount: 0 },
      serviceCharge: 0,
      vat: 0,
      total: 0,
      status: 'open',
      payments: [],
      openedBy: currentRole,
      openedByName: currentUserName,
      shiftId: currentShift ? currentShift.id : 'shift_default',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setOrders((prev) => [newOrder, ...prev]);
    setActiveOrderId(newOrder.id);
    return newOrder;
  }, [shopConfig.id, currentRole, currentUserName, currentShift]);

  const addItemToOrder = useCallback(
    (
      orderId: string,
      itemData: {
        itemId: string;
        nameTh: string;
        nameEn: string;
        price: number;
        qty: number;
        station: Station;
        selectedModifiers: OrderItem['selectedModifiers'];
        note?: string;
      }
    ) => {
      setOrders((prev) =>
        prev.map((ord) => {
          if (ord.id !== orderId) return ord;

          const newItem: OrderItem = {
            orderItemId: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            itemId: itemData.itemId,
            nameTh: itemData.nameTh,
            nameEn: itemData.nameEn,
            price: itemData.price,
            qty: itemData.qty,
            selectedModifiers: itemData.selectedModifiers,
            note: itemData.note,
            status: 'new', // new until sent to kitchen
            station: itemData.station,
          };

          const newItems = [...ord.items, newItem];
          const totals = calculateTotals(newItems, ord.discount, shopConfig.vatMode, shopConfig.vatRate, shopConfig.serviceChargeRate);

          return {
            ...ord,
            items: newItems,
            subtotal: totals.subtotal,
            serviceCharge: totals.serviceCharge,
            vat: totals.vat,
            total: totals.total,
            updatedAt: Date.now(),
          };
        })
      );
    },
    [calculateTotals, shopConfig.vatMode, shopConfig.vatRate, shopConfig.serviceChargeRate]
  );

  const updateOrderItemQty = useCallback((orderId: string, orderItemId: string, newQty: number) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;

        let newItems: OrderItem[];
        if (newQty <= 0) {
          // Can only remove if it's 'new'
          newItems = ord.items.filter((i) => !(i.orderItemId === orderItemId && i.status === 'new'));
        } else {
          newItems = ord.items.map((i) => (i.orderItemId === orderItemId ? { ...i, qty: newQty } : i));
        }

        const totals = calculateTotals(newItems, ord.discount, shopConfig.vatMode, shopConfig.vatRate, shopConfig.serviceChargeRate);

        return {
          ...ord,
          items: newItems,
          subtotal: totals.subtotal,
          serviceCharge: totals.serviceCharge,
          vat: totals.vat,
          total: totals.total,
          updatedAt: Date.now(),
        };
      })
    );
  }, [calculateTotals, shopConfig.vatMode, shopConfig.vatRate, shopConfig.serviceChargeRate]);

  // Send newly added items to kitchen & bar
  const sendOrderToKitchen = useCallback((orderId: string) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;

        let hasNewItems = false;
        const now = Date.now();
        const updatedItems = ord.items.map((item) => {
          if (item.status === 'new') {
            hasNewItems = true;
            return {
              ...item,
              status: 'sent' as ItemStatus,
              sentAt: now,
            };
          }
          return item;
        });

        if (hasNewItems) {
          sound.playKitchenOrderAlert();
        }

        return {
          ...ord,
          items: updatedItems,
          updatedAt: now,
        };
      })
    );
  }, []);

  const updateItemStatus = useCallback((orderId: string, orderItemId: string, status: ItemStatus) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;
        const updatedItems = ord.items.map((item) =>
          item.orderItemId === orderItemId ? { ...item, status } : item
        );
        return {
          ...ord,
          items: updatedItems,
          updatedAt: Date.now(),
        };
      })
    );
  }, []);

  const markTicketReady = useCallback((orderId: string, station?: Station) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;
        const updatedItems = ord.items.map((item) => {
          if (station && item.station !== station) return item;
          if (item.status === 'sent' || item.status === 'cooking') {
            return { ...item, status: 'ready' as ItemStatus };
          }
          return item;
        });
        return {
          ...ord,
          items: updatedItems,
          updatedAt: Date.now(),
        };
      })
    );
    sound.playKitchenOrderAlert();
  }, []);

  const voidItem = useCallback(async (orderId: string, orderItemId: string, reason: string): Promise<boolean> => {
    sound.playWarning();
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;

        const updatedItems = ord.items.map((item) => {
          if (item.orderItemId === orderItemId) {
            return {
              ...item,
              status: 'voided' as ItemStatus,
              voidReason: reason,
              voidedBy: currentUserName,
            };
          }
          return item;
        });

        const totals = calculateTotals(updatedItems, ord.discount, shopConfig.vatMode, shopConfig.vatRate, shopConfig.serviceChargeRate);

        return {
          ...ord,
          items: updatedItems,
          subtotal: totals.subtotal,
          serviceCharge: totals.serviceCharge,
          vat: totals.vat,
          total: totals.total,
          updatedAt: Date.now(),
        };
      })
    );
    return true;
  }, [calculateTotals, shopConfig.vatMode, shopConfig.vatRate, shopConfig.serviceChargeRate, currentUserName]);

  const voidEntireOrder = useCallback(async (orderId: string, reason: string): Promise<boolean> => {
    sound.playWarning();
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;
        return {
          ...ord,
          status: 'void',
          voidReason: reason,
          updatedAt: Date.now(),
        };
      })
    );
    if (activeOrderId === orderId) {
      setActiveOrderId(null);
    }
    return true;
  }, [activeOrderId]);

  const moveTable = useCallback((orderId: string, targetTableId: string): boolean => {
    const targetTable = tablesConfig.tables.find((t) => t.id === targetTableId);
    if (!targetTable) return false;

    // Ensure target table doesn't already have an active open order
    const isOccupied = orders.some((o) => o.tableId === targetTableId && o.status === 'open' && o.id !== orderId);
    if (isOccupied) return false;

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;
        return {
          ...ord,
          tableId: targetTableId,
          tableName: targetTable.name,
          updatedAt: Date.now(),
        };
      })
    );
    return true;
  }, [tablesConfig.tables, orders]);

  const mergeOrders = useCallback((sourceOrderId: string, targetOrderId: string): boolean => {
    const source = orders.find((o) => o.id === sourceOrderId);
    const target = orders.find((o) => o.id === targetOrderId);
    if (!source || !target || source.status !== 'open' || target.status !== 'open') return false;

    setOrders((prev) => {
      const mergedItems = [...target.items, ...source.items];
      const totals = calculateTotals(mergedItems, target.discount, shopConfig.vatMode, shopConfig.vatRate, shopConfig.serviceChargeRate);

      return prev.map((ord) => {
        if (ord.id === targetOrderId) {
          return {
            ...ord,
            items: mergedItems,
            subtotal: totals.subtotal,
            serviceCharge: totals.serviceCharge,
            vat: totals.vat,
            total: totals.total,
            updatedAt: Date.now(),
          };
        }
        if (ord.id === sourceOrderId) {
          return {
            ...ord,
            status: 'void',
            voidReason: `รวมเข้ากับบิล ${target.tableName} (${target.queueNumber})`,
            items: [],
            total: 0,
            updatedAt: Date.now(),
          };
        }
        return ord;
      });
    });

    if (activeOrderId === sourceOrderId) {
      setActiveOrderId(targetOrderId);
    }
    return true;
  }, [orders, calculateTotals, shopConfig.vatMode, shopConfig.vatRate, shopConfig.serviceChargeRate, activeOrderId]);

  const applyOrderDiscount = useCallback((orderId: string, discount: OrderDiscount) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;
        const totals = calculateTotals(ord.items, discount, shopConfig.vatMode, shopConfig.vatRate, shopConfig.serviceChargeRate);
        return {
          ...ord,
          discount: {
            ...discount,
            amount: totals.discountAmount,
          },
          subtotal: totals.subtotal,
          serviceCharge: totals.serviceCharge,
          vat: totals.vat,
          total: totals.total,
          updatedAt: Date.now(),
        };
      })
    );
  }, [calculateTotals, shopConfig.vatMode, shopConfig.vatRate, shopConfig.serviceChargeRate]);

  // Payment settlement & running daily summary doc update
  const processPayment = useCallback(
    (orderId: string, payments: PaymentRecord[]) => {
      const recSeq = Number(localStorage.getItem(LS_REC_SEQ) || '101');
      localStorage.setItem(LS_REC_SEQ, String(recSeq + 1));

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const receiptNumber = `INV-${year}${month}${day}-${String(recSeq).padStart(4, '0')}`;

      let paidOrder: Order | null = null;

      setOrders((prev) =>
        prev.map((ord) => {
          if (ord.id !== orderId) return ord;

          paidOrder = {
            ...ord,
            status: 'paid',
            receiptNumber,
            payments,
            paidAt: Date.now(),
            updatedAt: Date.now(),
          };
          return paidOrder;
        })
      );

      // Sound feedback
      sound.playPaymentSuccess();

      // Atomically update running Daily Summary document (matching Firestore increment design)
      if (paidOrder) {
        const orderToSummarize = paidOrder as Order;
        setDailySummaries((prev) => {
          const existing: DailySummary = prev[dateStr] || {
            date: dateStr,
            salesTotal: 0,
            billCount: 0,
            paymentTotals: { cash: 0, promptpay: 0, card: 0, other: 0 },
            topItems: {},
            voidCount: 0,
            voidAmount: 0,
            discountTotal: 0,
            serviceChargeTotal: 0,
            vatTotal: 0,
          };

          const newPaymentTotals = { ...existing.paymentTotals };
          payments.forEach((p) => {
            newPaymentTotals[p.method] = (newPaymentTotals[p.method] || 0) + p.amount;
          });

          const newTopItems = { ...existing.topItems };
          orderToSummarize.items.forEach((item) => {
            if (item.status !== 'voided') {
              const current = newTopItems[item.itemId] || {
                nameTh: item.nameTh,
                nameEn: item.nameEn,
                qty: 0,
                total: 0,
              };
              newTopItems[item.itemId] = {
                nameTh: item.nameTh,
                nameEn: item.nameEn,
                qty: current.qty + item.qty,
                total: current.total + item.price * item.qty,
              };
            }
          });

          return {
            ...prev,
            [dateStr]: {
              date: dateStr,
              salesTotal: existing.salesTotal + orderToSummarize.total,
              billCount: existing.billCount + 1,
              paymentTotals: newPaymentTotals,
              topItems: newTopItems,
              voidCount: existing.voidCount,
              voidAmount: existing.voidAmount,
              discountTotal: existing.discountTotal + orderToSummarize.discount.amount,
              serviceChargeTotal: existing.serviceChargeTotal + orderToSummarize.serviceCharge,
              vatTotal: existing.vatTotal + orderToSummarize.vat,
            },
          };
        });
      }

      return {
        order: paidOrder || ({} as Order),
        receiptNumber,
      };
    },
    []
  );

  const getDailySummary = useCallback(
    (dateStr: string): DailySummary => {
      return (
        dailySummaries[dateStr] || {
          date: dateStr,
          salesTotal: 0,
          billCount: 0,
          paymentTotals: { cash: 0, promptpay: 0, card: 0, other: 0 },
          topItems: {},
          voidCount: 0,
          voidAmount: 0,
          discountTotal: 0,
          serviceChargeTotal: 0,
          vatTotal: 0,
        }
      );
    },
    [dailySummaries]
  );

  const activeOrder = orders.find((o) => o.id === activeOrderId && o.status === 'open') || null;

  return (
    <PosContext.Provider
      value={{
        shopConfig,
        tablesConfig,
        menuConfig,
        updateShopConfig,
        updateMenuConfig,
        updateTablesConfig,
        resetDemoData,

        isDemoMode,
        toggleDemoMode,
        isOnline,
        pendingSyncCount,
        firebaseConfig: getStoredFirebaseConfig(),
        saveFirebaseSettings,

        currentRole,
        setCurrentRole,
        currentUserName,
        verifyManagerPin,
        changeManagerPin,

        language,
        setLanguage,
        isDarkMode,
        toggleDarkMode,

        currentShift,
        openShift,
        closeShift,
        recordCashMovement,

        orders,
        activeOrder,
        setActiveOrderById: setActiveOrderId,
        createDineInOrder,
        createTakeawayOrder,
        addItemToOrder,
        updateOrderItemQty,
        sendOrderToKitchen,
        updateItemStatus,
        markTicketReady,
        voidItem,
        voidEntireOrder,
        moveTable,
        mergeOrders,
        applyOrderDiscount,
        processPayment,

        dailySummaries,
        getDailySummary,
      }}
    >
      {children}
    </PosContext.Provider>
  );
};

export function usePos() {
  const context = useContext(PosContext);
  if (!context) {
    throw new Error('usePos must be used within a PosProvider');
  }
  return context;
}
