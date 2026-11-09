import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';
import { handleFirestoreError, OperationType } from './errors';
import {
  MenuItem,
  ShopConfig,
  TablesConfig,
  MenuConfig,
  Order,
  Shift,
  Ingredient,
  StockItem,
  Expense,
} from '../types';

/**
 * Generic listener for a subcollection under users/{uid}/{collectionName}
 */
export function listenUserCollection<T>(
  uid: string,
  collectionName: string,
  onData: (items: T[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colPath = `users/${uid}/${collectionName}`;
  const colRef = collection(db, 'users', uid, collectionName);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as T[];
      onData(items);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.GET, colPath);
    }
  );
}

/**
 * Generic listener for a single document under users/{uid}/settings/{settingId}
 */
export function listenUserSetting<T>(
  uid: string,
  settingId: string,
  onData: (data: T | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const docPath = `users/${uid}/settings/${settingId}`;
  const docRef = doc(db, 'users', uid, 'settings', settingId);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data() as T);
      } else {
        onData(null);
      }
    },
    (error) => {
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.GET, docPath);
    }
  );
}

/**
 * Save single document with serverTimestamp
 */
export async function saveUserDoc(
  uid: string,
  collectionName: string,
  docId: string,
  data: Record<string, any>
): Promise<void> {
  const docPath = `users/${uid}/${collectionName}/${docId}`;
  try {
    const docRef = doc(db, 'users', uid, collectionName, docId);
    await setDoc(
      docRef,
      {
        ...data,
        id: docId,
        updatedAt: serverTimestamp(),
        createdAt: data.createdAt ? data.createdAt : serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

/**
 * Delete single document
 */
export async function deleteUserDoc(
  uid: string,
  collectionName: string,
  docId: string
): Promise<void> {
  const docPath = `users/${uid}/${collectionName}/${docId}`;
  try {
    const docRef = doc(db, 'users', uid, collectionName, docId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

/**
 * Export all user data as a JSON structure
 */
export async function exportAllUserData(uid: string): Promise<Record<string, any>> {
  const collections = ['menus', 'ingredients', 'stock', 'expenses', 'sales', 'shifts', 'settings'];
  const result: Record<string, any> = {
    exportedAt: new Date().toISOString(),
    uid,
  };

  for (const col of collections) {
    const colPath = `users/${uid}/${col}`;
    try {
      const snap = await getDocs(collection(db, 'users', uid, col));
      result[col] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.warn(`Export warning for ${colPath}:`, err);
      result[col] = [];
    }
  }

  return result;
}

/**
 * Import JSON object into Firestore under users/{uid}
 */
export async function importAllUserData(
  uid: string,
  jsonData: Record<string, any>
): Promise<number> {
  const collections = ['menus', 'ingredients', 'stock', 'expenses', 'sales', 'shifts', 'settings'];
  let importedCount = 0;

  for (const col of collections) {
    if (Array.isArray(jsonData[col])) {
      for (const item of jsonData[col]) {
        if (item && item.id) {
          await saveUserDoc(uid, col, item.id, item);
          importedCount++;
        }
      }
    }
  }

  return importedCount;
}

/**
 * Seed initial Thai restaurant data directly into user's Cloud Firestore collections
 */
export async function seedInitialFirestoreData(
  uid: string,
  shopConfig: ShopConfig,
  tablesConfig: TablesConfig,
  menuConfig: MenuConfig
): Promise<void> {
  // 1. Settings: shop and tables
  await saveUserDoc(uid, 'settings', 'shop', shopConfig);
  await saveUserDoc(uid, 'settings', 'tables', tablesConfig);
  await saveUserDoc(uid, 'settings', 'menu_config', {
    categories: menuConfig.categories,
    modifierGroups: menuConfig.modifierGroups,
  });

  // 2. Individual menu items
  for (const item of menuConfig.items) {
    await saveUserDoc(uid, 'menus', item.id, item);
  }

  // 3. Default sample ingredients
  const sampleIngredients: Ingredient[] = [
    { id: 'ing_1', name: 'ข้าวหอมมะลิ', unit: 'กก.', costPerUnit: 45, currentStock: 50 },
    { id: 'ing_2', name: 'หมูกรอบ', unit: 'กก.', costPerUnit: 280, currentStock: 15 },
    { id: 'ing_3', name: 'ใบกะเพรา', unit: 'กำ', costPerUnit: 10, currentStock: 30 },
    { id: 'ing_4', name: 'เมล็ดกาแฟดอยช้าง', unit: 'กก.', costPerUnit: 350, currentStock: 8 },
    { id: 'ing_5', name: 'ชาตรามือ', unit: 'ถุง', costPerUnit: 75, currentStock: 12 },
    { id: 'ing_6', name: 'กุ้งสด', unit: 'กก.', costPerUnit: 240, currentStock: 10 },
  ];

  for (const ing of sampleIngredients) {
    await saveUserDoc(uid, 'ingredients', ing.id, ing);
  }

  // 4. Default stock items
  const sampleStock: StockItem[] = [
    { id: 'stk_1', name: 'แก้วกาแฟ 16oz', quantity: 500, unit: 'ใบ', minThreshold: 100 },
    { id: 'stk_2', name: 'หลอดกระดาษ', quantity: 800, unit: 'ชิ้น', minThreshold: 150 },
    { id: 'stk_3', name: 'กล่องอาหารรักษ์โลก', quantity: 200, unit: 'กล่อง', minThreshold: 50 },
  ];

  for (const stk of sampleStock) {
    await saveUserDoc(uid, 'stock', stk.id, stk);
  }

  // 5. Default initial expense
  const sampleExpense: Expense[] = [
    {
      id: 'exp_1',
      title: 'ซื้อวัตถุดิบตลาดสดช่วงเช้า',
      amount: 1450,
      category: 'วัตถุดิบสด',
      note: 'ผักสด พริก กระเทียม หมูสด',
      date: new Date().toISOString().split('T')[0],
    },
  ];

  for (const exp of sampleExpense) {
    await saveUserDoc(uid, 'expenses', exp.id, exp);
  }
}
