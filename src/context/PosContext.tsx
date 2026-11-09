import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  ShopConfig,
  TablesConfig,
  MenuConfig,
  MenuItem,
  MenuCategory,
  ModifierGroup,
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
  Ingredient,
  StockItem,
  Expense,
} from '../types';
import {
  INITIAL_SHOP_CONFIG,
  INITIAL_TABLES_CONFIG,
  INITIAL_MENU_CONFIG,
} from '../data/seedData';
import {
  getStoredFirebaseConfig,
  saveStoredFirebaseConfig,
  isExplicitDemoMode,
  setExplicitDemoMode,
  type FirebaseClientConfig,
} from '../firebaseConfig';
import { auth, googleProvider } from '../firebase/config';
import {
  listenUserCollection,
  listenUserSetting,
  saveUserDoc,
  deleteUserDoc,
  exportAllUserData,
  importAllUserData,
  seedInitialFirestoreData,
} from '../firebase/firestoreService';
import { hashPin, DEFAULT_DEMO_PIN_HASH } from '../utils/hash';
import { sound } from '../utils/audio';

// Local storage backup keys
const LS_SHOP = 'sabaipos_shop_config_v1';
const LS_TABLES = 'sabaipos_tables_config_v1';
const LS_MENU = 'sabaipos_menu_config_v1';
const LS_ORDERS = 'sabaipos_orders_v1';
const LS_SHIFTS = 'sabaipos_shifts_v1';
const LS_ROLE = 'sabaipos_active_role_v1';
const LS_LANG = 'sabaipos_language_v1';
const LS_THEME = 'sabaipos_theme_v1';
const LS_QUEUE_SEQ = 'sabaipos_queue_seq_v1';
const LS_REC_SEQ = 'sabaipos_receipt_seq_v1';

interface PosContextType {
  // Authentication & User
  currentUser: User | null;
  authLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;

  // Firestore Sync State
  firestoreLoading: boolean;
  firestoreError: string | null;
  clearFirestoreError: () => void;

  // Configs
  shopConfig: ShopConfig;
  tablesConfig: TablesConfig;
  menuConfig: MenuConfig;
  updateShopConfig: (cfg: Partial<ShopConfig>) => void;
  updateMenuConfig: (cfg: Partial<MenuConfig>) => void;
  updateTablesConfig: (cfg: Partial<TablesConfig>) => void;
  resetDemoData: () => void;

  // Data Collections (Firestore: menus, ingredients, stock, expenses, sales)
  ingredients: Ingredient[];
  stock: StockItem[];
  expenses: Expense[];
  addIngredient: (item: Omit<Ingredient, 'id'>) => Promise<void>;
  updateIngredient: (id: string, item: Partial<Ingredient>) => Promise<void>;
  deleteIngredient: (id: string) => Promise<void>;
  addStockItem: (item: Omit<StockItem, 'id'>) => Promise<void>;
  updateStockItem: (id: string, item: Partial<StockItem>) => Promise<void>;
  deleteStockItem: (id: string) => Promise<void>;
  addExpense: (item: Omit<Expense, 'id'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  // Data Migration & Backup
  exportDataJson: () => Promise<Record<string, any>>;
  importDataJson: (jsonData: Record<string, any>) => Promise<number>;
  seedCloudData: () => Promise<void>;

  // Mode & Offline
  isDemoMode: boolean;
  toggleDemoMode: (enabled: boolean) => void;
  isOnline: boolean;
  pendingSyncCount: number;
  firebaseConfig: FirebaseClientConfig;
  saveFirebaseSettings: (cfg: FirebaseClientConfig) => void;

  // User & Roles
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
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [firestoreLoading, setFirestoreLoading] = useState<boolean>(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // System states
  const [isDemoMode, setIsDemoMode] = useState<boolean>(isExplicitDemoMode);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem(LS_LANG) as Language) || 'th';
  });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem(LS_THEME) === 'dark';
  });

  // Shop & Config state
  const [shopConfig, setShopConfig] = useState<ShopConfig>(() => {
    const raw = localStorage.getItem(LS_SHOP);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }
    return INITIAL_SHOP_CONFIG;
  });

  const [tablesConfig, setTablesConfig] = useState<TablesConfig>(() => {
    const raw = localStorage.getItem(LS_TABLES);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }
    return INITIAL_TABLES_CONFIG;
  });

  const [menuConfig, setMenuConfig] = useState<MenuConfig>(() => {
    const raw = localStorage.getItem(LS_MENU);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }
    return INITIAL_MENU_CONFIG;
  });

  // User & Roles
  const [currentRole, setCurrentRoleState] = useState<Role>(() => {
    return (localStorage.getItem(LS_ROLE) as Role) || 'cashier';
  });
  const currentUserName =
    currentRole === 'owner'
      ? 'สมชาย (เจ้าของร้าน)'
      : currentRole === 'manager'
      ? 'วิภา (ผู้จัดการ)'
      : currentRole === 'kitchen'
      ? 'เชฟชัย (หัวหน้าครัว)'
      : 'นารี (แคชเชียร์)';

  // Additional collections requested: ingredients, stock, expenses
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Shifts state
  const [shifts, setShifts] = useState<Shift[]>(() => {
    const raw = localStorage.getItem(LS_SHIFTS);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }
    const initialShift: Shift = {
      id: 'shift_' + Date.now(),
      shopId: INITIAL_SHOP_CONFIG.id,
      openedAt: Date.now() - 3600000 * 3,
      openedBy: 'user_cashier',
      openedByName: 'นารี (แคชเชียร์)',
      openingCash: 2000,
      cashMovements: [],
      status: 'open',
    };
    return [initialShift];
  });

  // Orders state
  const [orders, setOrders] = useState<Order[]>(() => {
    const raw = localStorage.getItem(LS_ORDERS);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }
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
              {
                groupId: 'mod_spicy_level',
                groupName: 'ระดับความเผ็ด',
                optionId: 'spicy_normal',
                optionName: 'เผ็ดปกติ',
                priceDelta: 0,
              },
              {
                groupId: 'mod_egg',
                groupName: 'เพิ่มไข่',
                optionId: 'egg_fried',
                optionName: 'ไข่ดาวกรอบ',
                priceDelta: 15,
              },
            ],
            status: 'cooking',
            station: 'kitchen',
            sentAt: now - 1000 * 60 * 12,
          },
          {
            orderItemId: 'item_o_2',
            itemId: 'item_thai_tea_slurpee',
            nameTh: 'ชาไทยสเลอปี้เข้มข้น',
            nameEn: 'Signature Thai Milk Tea Slurpee',
            price: 75,
            qty: 2,
            selectedModifiers: [
              {
                groupId: 'mod_sweetness',
                groupName: 'ระดับความหวาน',
                optionId: 'sweet_50',
                optionName: 'หวานน้อย (50%)',
                priceDelta: 0,
              },
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
        shiftId: 'shift_demo',
        createdAt: now - 1000 * 60 * 15,
        updatedAt: now - 1000 * 60 * 10,
      },
    ];
    return demoOrders;
  });

  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  // Monitor network online / offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor theme dark / light
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(LS_THEME, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(LS_THEME, 'light');
    }
  }, [isDarkMode]);

  // Auth Listener
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubAuth();
  }, []);

  // Firestore Real-Time Sync on User Change
  useEffect(() => {
    if (!currentUser) {
      setFirestoreLoading(false);
      return;
    }

    const uid = currentUser.uid;
    setFirestoreLoading(true);
    setFirestoreError(null);

    // 1. Listen to shop config
    const unsubShop = listenUserSetting<ShopConfig>(
      uid,
      'shop',
      (data) => {
        if (data) {
          setShopConfig(data);
          localStorage.setItem(LS_SHOP, JSON.stringify(data));
        }
      },
      (err) => setFirestoreError(err.message)
    );

    // 2. Listen to tables config
    const unsubTables = listenUserSetting<TablesConfig>(
      uid,
      'tables',
      (data) => {
        if (data) {
          setTablesConfig(data);
          localStorage.setItem(LS_TABLES, JSON.stringify(data));
        }
      },
      (err) => setFirestoreError(err.message)
    );

    // 3. Listen to menu_config (categories & modifier groups)
    const unsubMenuCfg = listenUserSetting<{
      categories: MenuConfig['categories'];
      modifierGroups: MenuConfig['modifierGroups'];
    }>(
      uid,
      'menu_config',
      (data) => {
        if (data) {
          setMenuConfig((prev) => ({
            ...prev,
            categories: data.categories || prev.categories,
            modifierGroups: data.modifierGroups || prev.modifierGroups,
          }));
        }
      },
      (err) => setFirestoreError(err.message)
    );

    // 4. Listen to menus subcollection
    const unsubMenus = listenUserCollection<MenuItem>(
      uid,
      'menus',
      (items) => {
        if (items.length > 0) {
          setMenuConfig((prev) => ({ ...prev, items }));
        } else {
          // If first login and empty, seed Thai restaurant items
          seedInitialFirestoreData(uid, shopConfig, tablesConfig, menuConfig).catch((err) =>
            console.error('Initial seed notice:', err)
          );
        }
        setFirestoreLoading(false);
      },
      (err) => {
        setFirestoreError(err.message);
        setFirestoreLoading(false);
      }
    );

    // 5. Listen to sales (orders)
    const unsubSales = listenUserCollection<Order>(
      uid,
      'sales',
      (salesList) => {
        if (salesList.length > 0) {
          // Sort by createdAt descending
          const sorted = [...salesList].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setOrders(sorted);
          localStorage.setItem(LS_ORDERS, JSON.stringify(sorted));
        }
      },
      (err) => setFirestoreError(err.message)
    );

    // 6. Listen to shifts
    const unsubShifts = listenUserCollection<Shift>(
      uid,
      'shifts',
      (shiftList) => {
        if (shiftList.length > 0) {
          const sorted = [...shiftList].sort((a, b) => (b.openedAt || 0) - (a.openedAt || 0));
          setShifts(sorted);
          localStorage.setItem(LS_SHIFTS, JSON.stringify(sorted));
        }
      },
      (err) => setFirestoreError(err.message)
    );

    // 7. Listen to ingredients
    const unsubIngredients = listenUserCollection<Ingredient>(
      uid,
      'ingredients',
      (ingList) => setIngredients(ingList),
      (err) => setFirestoreError(err.message)
    );

    // 8. Listen to stock
    const unsubStock = listenUserCollection<StockItem>(
      uid,
      'stock',
      (stockList) => setStock(stockList),
      (err) => setFirestoreError(err.message)
    );

    // 9. Listen to expenses
    const unsubExpenses = listenUserCollection<Expense>(
      uid,
      'expenses',
      (expList) => setExpenses(expList),
      (err) => setFirestoreError(err.message)
    );

    return () => {
      unsubShop();
      unsubTables();
      unsubMenuCfg();
      unsubMenus();
      unsubSales();
      unsubShifts();
      unsubIngredients();
      unsubStock();
      unsubExpenses();
    };
  }, [currentUser]);

  // Auth Methods
  const signInWithGoogle = async () => {
    try {
      setAuthLoading(true);
      setFirestoreError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Google Sign-in error:', error);
      setFirestoreError(error.message || 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้');
    } finally {
      setAuthLoading(false);
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (error: any) {
      console.error('Sign-out error:', error);
    }
  };

  const clearFirestoreError = () => {
    setFirestoreError(null);
  };

  // Language & Theme methods
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LS_LANG, lang);
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const toggleDemoMode = (enabled: boolean) => {
    setIsDemoMode(enabled);
    setExplicitDemoMode(enabled);
  };

  const saveFirebaseSettings = (cfg: FirebaseClientConfig) => {
    saveStoredFirebaseConfig(cfg);
  };

  const setCurrentRole = (role: Role) => {
    setCurrentRoleState(role);
    localStorage.setItem(LS_ROLE, role);
  };

  // Config Update Methods with Firestore Sync
  const updateShopConfig = (cfg: Partial<ShopConfig>) => {
    setShopConfig((prev) => {
      const updated = { ...prev, ...cfg };
      localStorage.setItem(LS_SHOP, JSON.stringify(updated));
      if (currentUser) {
        saveUserDoc(currentUser.uid, 'settings', 'shop', updated).catch(console.error);
      }
      return updated;
    });
  };

  const updateTablesConfig = (cfg: Partial<TablesConfig>) => {
    setTablesConfig((prev) => {
      const updated = { ...prev, ...cfg };
      localStorage.setItem(LS_TABLES, JSON.stringify(updated));
      if (currentUser) {
        saveUserDoc(currentUser.uid, 'settings', 'tables', updated).catch(console.error);
      }
      return updated;
    });
  };

  const updateMenuConfig = (cfg: Partial<MenuConfig>) => {
    setMenuConfig((prev) => {
      const updated = { ...prev, ...cfg };
      localStorage.setItem(LS_MENU, JSON.stringify(updated));
      if (currentUser) {
        // Save categories and modifier groups
        saveUserDoc(currentUser.uid, 'settings', 'menu_config', {
          categories: updated.categories,
          modifierGroups: updated.modifierGroups,
        }).catch(console.error);

        // Sync items
        if (cfg.items) {
          for (const item of cfg.items) {
            saveUserDoc(currentUser.uid, 'menus', item.id, item).catch(console.error);
          }
        }
      }
      return updated;
    });
  };

  const resetDemoData = () => {
    setShopConfig(INITIAL_SHOP_CONFIG);
    setTablesConfig(INITIAL_TABLES_CONFIG);
    setMenuConfig(INITIAL_MENU_CONFIG);
    localStorage.setItem(LS_SHOP, JSON.stringify(INITIAL_SHOP_CONFIG));
    localStorage.setItem(LS_TABLES, JSON.stringify(INITIAL_TABLES_CONFIG));
    localStorage.setItem(LS_MENU, JSON.stringify(INITIAL_MENU_CONFIG));
    if (currentUser) {
      seedInitialFirestoreData(
        currentUser.uid,
        INITIAL_SHOP_CONFIG,
        INITIAL_TABLES_CONFIG,
        INITIAL_MENU_CONFIG
      ).catch(console.error);
    }
  };

  // PIN Verification
  const verifyManagerPin = async (inputPin: string): Promise<boolean> => {
    const inputHash = await hashPin(inputPin);
    const targetHash = shopConfig.managerPinHash || DEFAULT_DEMO_PIN_HASH;
    return inputHash === targetHash;
  };

  const changeManagerPin = async (newPin: string): Promise<void> => {
    const newHash = await hashPin(newPin);
    updateShopConfig({ managerPinHash: newHash });
  };

  // Additional Collections: Ingredients, Stock, Expenses
  const addIngredient = async (item: Omit<Ingredient, 'id'>) => {
    const newId = 'ing_' + Date.now();
    const newIng: Ingredient = { ...item, id: newId };
    setIngredients((prev) => [...prev, newIng]);
    if (currentUser) {
      await saveUserDoc(currentUser.uid, 'ingredients', newId, newIng);
    }
  };

  const updateIngredient = async (id: string, item: Partial<Ingredient>) => {
    setIngredients((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...item } : i))
    );
    if (currentUser) {
      await saveUserDoc(currentUser.uid, 'ingredients', id, item);
    }
  };

  const deleteIngredient = async (id: string) => {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
    if (currentUser) {
      await deleteUserDoc(currentUser.uid, 'ingredients', id);
    }
  };

  const addStockItem = async (item: Omit<StockItem, 'id'>) => {
    const newId = 'stk_' + Date.now();
    const newStk: StockItem = { ...item, id: newId };
    setStock((prev) => [...prev, newStk]);
    if (currentUser) {
      await saveUserDoc(currentUser.uid, 'stock', newId, newStk);
    }
  };

  const updateStockItem = async (id: string, item: Partial<StockItem>) => {
    setStock((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...item } : s))
    );
    if (currentUser) {
      await saveUserDoc(currentUser.uid, 'stock', id, item);
    }
  };

  const deleteStockItem = async (id: string) => {
    setStock((prev) => prev.filter((s) => s.id !== id));
    if (currentUser) {
      await deleteUserDoc(currentUser.uid, 'stock', id);
    }
  };

  const addExpense = async (item: Omit<Expense, 'id'>) => {
    const newId = 'exp_' + Date.now();
    const newExp: Expense = { ...item, id: newId };
    setExpenses((prev) => [...prev, newExp]);
    if (currentUser) {
      await saveUserDoc(currentUser.uid, 'expenses', newId, newExp);
    }
  };

  const deleteExpense = async (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    if (currentUser) {
      await deleteUserDoc(currentUser.uid, 'expenses', id);
    }
  };

  // Export & Import
  const exportDataJson = async () => {
    if (currentUser) {
      return await exportAllUserData(currentUser.uid);
    }
    return {
      exportedAt: new Date().toISOString(),
      settings: [
        { ...shopConfig, id: 'shop' },
        { ...tablesConfig, id: 'tables' },
        { id: 'menu_config', categories: menuConfig.categories, modifierGroups: menuConfig.modifierGroups },
      ],
      menus: menuConfig.items,
      sales: orders,
      shifts,
      ingredients,
      stock,
      expenses,
    };
  };

  const importDataJson = async (jsonData: Record<string, any>) => {
    if (currentUser) {
      return await importAllUserData(currentUser.uid, jsonData);
    }
    return 0;
  };

  const seedCloudData = async () => {
    if (currentUser) {
      setFirestoreLoading(true);
      await seedInitialFirestoreData(currentUser.uid, shopConfig, tablesConfig, menuConfig);
      setFirestoreLoading(false);
    }
  };

  // Shift Management
  const currentShift = shifts.find((s) => s.status === 'open') || null;

  const openShift = (openingCash: number): Shift => {
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

    setShifts((prev) => {
      const closed = prev.map((s) =>
        s.status === 'open' ? { ...s, status: 'closed' as const, closedAt: Date.now() } : s
      );
      const updated = [newShift, ...closed];
      localStorage.setItem(LS_SHIFTS, JSON.stringify(updated));
      return updated;
    });

    if (currentUser) {
      saveUserDoc(currentUser.uid, 'shifts', newShift.id, newShift).catch(console.error);
    }

    sound.playSuccess();
    return newShift;
  };

  const closeShift = (
    closingCash: number
  ): { shift: Shift; expectedCash: number; difference: number } => {
    if (!currentShift) {
      throw new Error('No open shift to close');
    }

    const shiftOrders = orders.filter(
      (o) => o.shiftId === currentShift.id && o.status === 'paid'
    );

    let cashSales = 0;
    let promptPaySales = 0;
    let cardSales = 0;
    let otherSales = 0;

    for (const ord of shiftOrders) {
      for (const p of ord.payments) {
        if (p.method === 'cash') cashSales += p.amount;
        else if (p.method === 'promptpay') promptPaySales += p.amount;
        else if (p.method === 'card') cardSales += p.amount;
        else otherSales += p.amount;
      }
    }

    const movementsTotal = currentShift.cashMovements.reduce((acc, m) => {
      return m.type === 'pay_in' ? acc + m.amount : acc - m.amount;
    }, 0);

    const expectedCash = currentShift.openingCash + cashSales + movementsTotal;
    const difference = closingCash - expectedCash;

    const closedShift: Shift = {
      ...currentShift,
      status: 'closed',
      closedAt: Date.now(),
      closedBy: currentRole,
      closedByName: currentUserName,
      closingCash,
      expectedCash,
      difference,
      summary: {
        cashSales,
        promptPaySales,
        cardSales,
        otherSales,
        totalSales: cashSales + promptPaySales + cardSales + otherSales,
        billCount: shiftOrders.length,
      },
    };

    setShifts((prev) => {
      const updated = prev.map((s) => (s.id === currentShift.id ? closedShift : s));
      localStorage.setItem(LS_SHIFTS, JSON.stringify(updated));
      return updated;
    });

    if (currentUser) {
      saveUserDoc(currentUser.uid, 'shifts', closedShift.id, closedShift).catch(console.error);
    }

    sound.playSuccess();
    return { shift: closedShift, expectedCash, difference };
  };

  const recordCashMovement = (type: 'pay_in' | 'pay_out', amount: number, note: string) => {
    if (!currentShift) return;

    const movement = {
      id: 'mov_' + Date.now(),
      type,
      amount,
      note,
      timestamp: Date.now(),
      by: currentUserName,
    };

    const updatedShift: Shift = {
      ...currentShift,
      cashMovements: [...currentShift.cashMovements, movement],
    };

    setShifts((prev) => {
      const updated = prev.map((s) => (s.id === currentShift.id ? updatedShift : s));
      localStorage.setItem(LS_SHIFTS, JSON.stringify(updated));
      return updated;
    });

    if (currentUser) {
      saveUserDoc(currentUser.uid, 'shifts', updatedShift.id, updatedShift).catch(console.error);
    }
  };

  // Helper sequence generators
  const getNextQueue = (type: 'dine-in' | 'takeaway'): string => {
    const raw = parseInt(localStorage.getItem(LS_QUEUE_SEQ) || '1', 10);
    const prefix = type === 'dine-in' ? 'D' : 'T';
    const num = String(raw).padStart(2, '0');
    localStorage.setItem(LS_QUEUE_SEQ, String(raw + 1));
    return `${prefix}${num}`;
  };

  const getNextReceiptNumber = (): string => {
    const raw = parseInt(localStorage.getItem(LS_REC_SEQ) || '1', 10);
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const seq = String(raw).padStart(4, '0');
    localStorage.setItem(LS_REC_SEQ, String(raw + 1));
    return `INV-${yy}${mm}${dd}-${seq}`;
  };

  // Order Calculation helper
  const calculateTotals = (
    items: OrderItem[],
    discount: OrderDiscount,
    vatMode: ShopConfig['vatMode'],
    vatRate: number,
    serviceChargeRate: number
  ) => {
    const activeItems = items.filter((i) => i.status !== 'voided');

    const subtotal = activeItems.reduce((acc, item) => {
      const modTotal = item.selectedModifiers.reduce((mAcc, m) => mAcc + m.priceDelta, 0);
      return acc + (item.price + modTotal) * item.qty;
    }, 0);

    let discAmount = 0;
    if (discount.type === 'percent') {
      discAmount = (subtotal * discount.value) / 100;
    } else {
      discAmount = Math.min(discount.value, subtotal);
    }
    const afterDiscount = Math.max(0, subtotal - discAmount);

    let serviceCharge = 0;
    if (serviceChargeRate > 0) {
      serviceCharge = (afterDiscount * serviceChargeRate) / 100;
    }

    const taxableBase = afterDiscount + serviceCharge;

    let vat = 0;
    let total = taxableBase;

    if (vatMode === 'included') {
      vat = taxableBase - taxableBase / (1 + vatRate / 100);
      total = taxableBase;
    } else if (vatMode === 'excluded') {
      vat = (taxableBase * vatRate) / 100;
      total = taxableBase + vat;
    } else {
      vat = 0;
      total = taxableBase;
    }

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount: Math.round(discAmount * 100) / 100,
      serviceCharge: Math.round(serviceCharge * 100) / 100,
      vat: Math.round(vat * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  };

  // Orders Actions with Cloud Firestore Sync
  const createDineInOrder = (tableId: string, guestCount: number = 2): Order => {
    const table = tablesConfig.tables.find((t) => t.id === tableId);
    const tableName = table ? table.name : 'Table';
    const queueNumber = getNextQueue('dine-in');

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
      shiftId: currentShift ? currentShift.id : 'shift_unknown',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setOrders((prev) => {
      const updated = [newOrder, ...prev];
      localStorage.setItem(LS_ORDERS, JSON.stringify(updated));
      return updated;
    });

    if (currentUser) {
      saveUserDoc(currentUser.uid, 'sales', newOrder.id, newOrder).catch(console.error);
    }

    setActiveOrderId(newOrder.id);
    return newOrder;
  };

  const createTakeawayOrder = (): Order => {
    const queueNumber = getNextQueue('takeaway');

    const newOrder: Order = {
      id: 'ord_' + Date.now(),
      shopId: shopConfig.id,
      tableId: null,
      tableName: 'กลับบ้าน (Takeaway)',
      type: 'takeaway',
      queueNumber,
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
      shiftId: currentShift ? currentShift.id : 'shift_unknown',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setOrders((prev) => {
      const updated = [newOrder, ...prev];
      localStorage.setItem(LS_ORDERS, JSON.stringify(updated));
      return updated;
    });

    if (currentUser) {
      saveUserDoc(currentUser.uid, 'sales', newOrder.id, newOrder).catch(console.error);
    }

    setActiveOrderId(newOrder.id);
    return newOrder;
  };

  const addItemToOrder = (
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
  ) => {
    setOrders((prev) => {
      const target = prev.find((o) => o.id === orderId);
      if (!target || target.status !== 'open') return prev;

      // Check if identical item (same itemId, modifiers, note) with status 'new' exists
      const modKey = (mods: OrderItem['selectedModifiers']) =>
        mods.map((m) => `${m.optionId}_${m.priceDelta}`).sort().join('|');

      const existingIndex = target.items.findIndex(
        (i) =>
          i.itemId === item.itemId &&
          i.status === 'new' &&
          (i.note || '') === (item.note || '') &&
          modKey(i.selectedModifiers) === modKey(item.selectedModifiers)
      );

      let newItems: OrderItem[] = [];
      if (existingIndex >= 0) {
        newItems = target.items.map((it, idx) =>
          idx === existingIndex ? { ...it, qty: it.qty + item.qty } : it
        );
      } else {
        const newItem: OrderItem = {
          orderItemId: 'oi_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          itemId: item.itemId,
          nameTh: item.nameTh,
          nameEn: item.nameEn,
          price: item.price,
          qty: item.qty,
          selectedModifiers: item.selectedModifiers,
          note: item.note,
          status: 'new',
          station: item.station,
        };
        newItems = [...target.items, newItem];
      }

      const totals = calculateTotals(
        newItems,
        target.discount,
        shopConfig.vatMode,
        shopConfig.vatRate,
        shopConfig.serviceChargeRate
      );

      const updatedOrder: Order = {
        ...target,
        items: newItems,
        subtotal: totals.subtotal,
        discount: { ...target.discount, amount: totals.discountAmount },
        serviceCharge: totals.serviceCharge,
        vat: totals.vat,
        total: totals.total,
        updatedAt: Date.now(),
      };

      const updatedList = prev.map((o) => (o.id === orderId ? updatedOrder : o));
      localStorage.setItem(LS_ORDERS, JSON.stringify(updatedList));

      if (currentUser) {
        saveUserDoc(currentUser.uid, 'sales', updatedOrder.id, updatedOrder).catch(console.error);
      }

      return updatedList;
    });

    sound.playTap();
  };

  const updateOrderItemQty = (orderId: string, orderItemId: string, newQty: number) => {
    setOrders((prev) => {
      const target = prev.find((o) => o.id === orderId);
      if (!target || target.status !== 'open') return prev;

      let newItems: OrderItem[] = [];
      if (newQty <= 0) {
        newItems = target.items.filter((i) => i.orderItemId !== orderItemId);
      } else {
        newItems = target.items.map((i) =>
          i.orderItemId === orderItemId ? { ...i, qty: newQty } : i
        );
      }

      const totals = calculateTotals(
        newItems,
        target.discount,
        shopConfig.vatMode,
        shopConfig.vatRate,
        shopConfig.serviceChargeRate
      );

      const updatedOrder: Order = {
        ...target,
        items: newItems,
        subtotal: totals.subtotal,
        discount: { ...target.discount, amount: totals.discountAmount },
        serviceCharge: totals.serviceCharge,
        vat: totals.vat,
        total: totals.total,
        updatedAt: Date.now(),
      };

      const updatedList = prev.map((o) => (o.id === orderId ? updatedOrder : o));
      localStorage.setItem(LS_ORDERS, JSON.stringify(updatedList));

      if (currentUser) {
        saveUserDoc(currentUser.uid, 'sales', updatedOrder.id, updatedOrder).catch(console.error);
      }

      return updatedList;
    });
  };

  const sendOrderToKitchen = (orderId: string) => {
    setOrders((prev) => {
      const target = prev.find((o) => o.id === orderId);
      if (!target) return prev;

      const now = Date.now();
      let hasNew = false;
      const updatedItems = target.items.map((i) => {
        if (i.status === 'new') {
          hasNew = true;
          return { ...i, status: 'cooking' as ItemStatus, sentAt: now };
        }
        return i;
      });

      if (!hasNew) return prev;

      const updatedOrder: Order = {
        ...target,
        items: updatedItems,
        updatedAt: now,
      };

      const updatedList = prev.map((o) => (o.id === orderId ? updatedOrder : o));
      localStorage.setItem(LS_ORDERS, JSON.stringify(updatedList));

      if (currentUser) {
        saveUserDoc(currentUser.uid, 'sales', updatedOrder.id, updatedOrder).catch(console.error);
      }

      sound.playSuccess();
      return updatedList;
    });
  };

  const updateItemStatus = (orderId: string, orderItemId: string, status: ItemStatus) => {
    setOrders((prev) => {
      const target = prev.find((o) => o.id === orderId);
      if (!target) return prev;

      const updatedItems = target.items.map((i) =>
        i.orderItemId === orderItemId ? { ...i, status } : i
      );

      const updatedOrder: Order = {
        ...target,
        items: updatedItems,
        updatedAt: Date.now(),
      };

      const updatedList = prev.map((o) => (o.id === orderId ? updatedOrder : o));
      localStorage.setItem(LS_ORDERS, JSON.stringify(updatedList));

      if (currentUser) {
        saveUserDoc(currentUser.uid, 'sales', updatedOrder.id, updatedOrder).catch(console.error);
      }

      return updatedList;
    });
  };

  const markTicketReady = (orderId: string, station?: Station) => {
    setOrders((prev) => {
      const target = prev.find((o) => o.id === orderId);
      if (!target) return prev;

      const updatedItems = target.items.map((i) => {
        if (i.status === 'cooking' && (!station || i.station === station)) {
          return { ...i, status: 'ready' as ItemStatus };
        }
        return i;
      });

      const updatedOrder: Order = {
        ...target,
        items: updatedItems,
        updatedAt: Date.now(),
      };

      const updatedList = prev.map((o) => (o.id === orderId ? updatedOrder : o));
      localStorage.setItem(LS_ORDERS, JSON.stringify(updatedList));

      if (currentUser) {
        saveUserDoc(currentUser.uid, 'sales', updatedOrder.id, updatedOrder).catch(console.error);
      }

      sound.playBell();
      return updatedList;
    });
  };

  const voidItem = async (
    orderId: string,
    orderItemId: string,
    reason: string
  ): Promise<boolean> => {
    setOrders((prev) => {
      const target = prev.find((o) => o.id === orderId);
      if (!target) return prev;

      const updatedItems = target.items.map((i) =>
        i.orderItemId === orderItemId
          ? {
              ...i,
              status: 'voided' as ItemStatus,
              voidReason: reason,
              voidedBy: currentUserName,
            }
          : i
      );

      const totals = calculateTotals(
        updatedItems,
        target.discount,
        shopConfig.vatMode,
        shopConfig.vatRate,
        shopConfig.serviceChargeRate
      );

      const updatedOrder: Order = {
        ...target,
        items: updatedItems,
        subtotal: totals.subtotal,
        discount: { ...target.discount, amount: totals.discountAmount },
        serviceCharge: totals.serviceCharge,
        vat: totals.vat,
        total: totals.total,
        updatedAt: Date.now(),
      };

      const updatedList = prev.map((o) => (o.id === orderId ? updatedOrder : o));
      localStorage.setItem(LS_ORDERS, JSON.stringify(updatedList));

      if (currentUser) {
        saveUserDoc(currentUser.uid, 'sales', updatedOrder.id, updatedOrder).catch(console.error);
      }

      return updatedList;
    });

    return true;
  };

  const voidEntireOrder = async (orderId: string, reason: string): Promise<boolean> => {
    setOrders((prev) => {
      const target = prev.find((o) => o.id === orderId);
      if (!target) return prev;

      const updatedOrder: Order = {
        ...target,
        status: 'void',
        voidReason: reason,
        updatedAt: Date.now(),
      };

      const updatedList = prev.map((o) => (o.id === orderId ? updatedOrder : o));
      localStorage.setItem(LS_ORDERS, JSON.stringify(updatedList));

      if (currentUser) {
        saveUserDoc(currentUser.uid, 'sales', updatedOrder.id, updatedOrder).catch(console.error);
      }

      return updatedList;
    });

    if (activeOrderId === orderId) {
      setActiveOrderId(null);
    }

    return true;
  };

  const moveTable = (orderId: string, targetTableId: string): boolean => {
    const targetTable = tablesConfig.tables.find((t) => t.id === targetTableId);
    if (!targetTable) return false;

    setOrders((prev) => {
      const target = prev.find((o) => o.id === orderId);
      if (!target) return prev;

      const updatedOrder: Order = {
        ...target,
        tableId: targetTableId,
        tableName: targetTable.name,
        updatedAt: Date.now(),
      };

      const updatedList = prev.map((o) => (o.id === orderId ? updatedOrder : o));
      localStorage.setItem(LS_ORDERS, JSON.stringify(updatedList));

      if (currentUser) {
        saveUserDoc(currentUser.uid, 'sales', updatedOrder.id, updatedOrder).catch(console.error);
      }

      return updatedList;
    });

    return true;
  };

  const mergeOrders = (sourceOrderId: string, targetOrderId: string): boolean => {
    setOrders((prev) => {
      const source = prev.find((o) => o.id === sourceOrderId);
      const target = prev.find((o) => o.id === targetOrderId);
      if (!source || !target) return prev;

      const mergedItems = [...target.items, ...source.items];
      const totals = calculateTotals(
        mergedItems,
        target.discount,
        shopConfig.vatMode,
        shopConfig.vatRate,
        shopConfig.serviceChargeRate
      );

      const updatedTarget: Order = {
        ...target,
        items: mergedItems,
        subtotal: totals.subtotal,
        discount: { ...target.discount, amount: totals.discountAmount },
        serviceCharge: totals.serviceCharge,
        vat: totals.vat,
        total: totals.total,
        updatedAt: Date.now(),
      };

      const closedSource: Order = {
        ...source,
        status: 'void',
        voidReason: `รวมเข้ากับบิล ${target.tableName} (${target.queueNumber})`,
        updatedAt: Date.now(),
      };

      const updatedList = prev.map((o) =>
        o.id === targetOrderId ? updatedTarget : o.id === sourceOrderId ? closedSource : o
      );

      localStorage.setItem(LS_ORDERS, JSON.stringify(updatedList));

      if (currentUser) {
        saveUserDoc(currentUser.uid, 'sales', updatedTarget.id, updatedTarget).catch(console.error);
        saveUserDoc(currentUser.uid, 'sales', closedSource.id, closedSource).catch(console.error);
      }

      return updatedList;
    });

    return true;
  };

  const applyOrderDiscount = (orderId: string, discount: OrderDiscount) => {
    setOrders((prev) => {
      const target = prev.find((o) => o.id === orderId);
      if (!target) return prev;

      const totals = calculateTotals(
        target.items,
        discount,
        shopConfig.vatMode,
        shopConfig.vatRate,
        shopConfig.serviceChargeRate
      );

      const updatedOrder: Order = {
        ...target,
        discount: { ...discount, amount: totals.discountAmount },
        subtotal: totals.subtotal,
        serviceCharge: totals.serviceCharge,
        vat: totals.vat,
        total: totals.total,
        updatedAt: Date.now(),
      };

      const updatedList = prev.map((o) => (o.id === orderId ? updatedOrder : o));
      localStorage.setItem(LS_ORDERS, JSON.stringify(updatedList));

      if (currentUser) {
        saveUserDoc(currentUser.uid, 'sales', updatedOrder.id, updatedOrder).catch(console.error);
      }

      return updatedList;
    });
  };

  const processPayment = (
    orderId: string,
    payments: PaymentRecord[]
  ): { order: Order; receiptNumber: string } => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) throw new Error('Order not found');

    const receiptNumber = getNextReceiptNumber();
    const paidOrder: Order = {
      ...target,
      status: 'paid',
      payments,
      receiptNumber,
      paidAt: Date.now(),
      updatedAt: Date.now(),
    };

    setOrders((prev) => {
      const updatedList = prev.map((o) => (o.id === orderId ? paidOrder : o));
      localStorage.setItem(LS_ORDERS, JSON.stringify(updatedList));
      return updatedList;
    });

    if (currentUser) {
      saveUserDoc(currentUser.uid, 'sales', paidOrder.id, paidOrder).catch(console.error);
    }

    sound.playCashRegister();
    return { order: paidOrder, receiptNumber };
  };

  // Daily Summaries Calculation
  const dailySummaries = useCallback((): Record<string, DailySummary> => {
    const summaries: Record<string, DailySummary> = {};

    for (const ord of orders) {
      if (ord.status !== 'paid') continue;

      const d = new Date(ord.paidAt || ord.updatedAt);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;

      if (!summaries[dateKey]) {
        summaries[dateKey] = {
          date: dateKey,
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
      }

      const sum = summaries[dateKey];
      sum.salesTotal += ord.total;
      sum.billCount += 1;
      sum.discountTotal += ord.discount.amount || 0;
      sum.serviceChargeTotal += ord.serviceCharge || 0;
      sum.vatTotal += ord.vat || 0;

      for (const p of ord.payments) {
        if (p.method === 'cash') sum.paymentTotals.cash += p.amount;
        else if (p.method === 'promptpay') sum.paymentTotals.promptpay += p.amount;
        else if (p.method === 'card') sum.paymentTotals.card += p.amount;
        else sum.paymentTotals.other += p.amount;
      }

      for (const it of ord.items) {
        if (it.status === 'voided') {
          sum.voidCount += it.qty;
          sum.voidAmount += it.price * it.qty;
          continue;
        }

        if (!sum.topItems[it.itemId]) {
          sum.topItems[it.itemId] = {
            nameTh: it.nameTh,
            nameEn: it.nameEn,
            qty: 0,
            total: 0,
          };
        }
        sum.topItems[it.itemId].qty += it.qty;
        sum.topItems[it.itemId].total += it.price * it.qty;
      }
    }

    return summaries;
  }, [orders])();

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
        currentUser,
        authLoading,
        signInWithGoogle,
        signOutUser,

        firestoreLoading,
        firestoreError,
        clearFirestoreError,

        shopConfig,
        tablesConfig,
        menuConfig,
        updateShopConfig,
        updateMenuConfig,
        updateTablesConfig,
        resetDemoData,

        ingredients,
        stock,
        expenses,
        addIngredient,
        updateIngredient,
        deleteIngredient,
        addStockItem,
        updateStockItem,
        deleteStockItem,
        addExpense,
        deleteExpense,

        exportDataJson,
        importDataJson,
        seedCloudData,

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
