import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

// Default placeholder config
export const DEFAULT_FIREBASE_CONFIG: FirebaseClientConfig = {
  apiKey: 'AIzaSyDemoPlaceHolderKeyForSabaiPOS000000',
  authDomain: 'sabaipos-demo.firebaseapp.com',
  projectId: 'sabaipos-demo',
  storageBucket: 'sabaipos-demo.appspot.com',
  messagingSenderId: '123456789012',
  appId: '1:123456789012:web:demo123456789abcdef',
};

const STORAGE_KEY = 'sabaipos_firebase_config';
const DEMO_MODE_KEY = 'sabaipos_demo_mode_active';

export function getStoredFirebaseConfig(): FirebaseClientConfig {
  if (typeof window === 'undefined') return DEFAULT_FIREBASE_CONFIG;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // fallback
    }
  }
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveStoredFirebaseConfig(config: FirebaseClientConfig) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }
}

export function isExplicitDemoMode(): boolean {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem(DEMO_MODE_KEY);
  if (val === null) return true; // Default to demo mode so user can test immediately!
  return val === 'true';
}

export function setExplicitDemoMode(enabled: boolean) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DEMO_MODE_KEY, enabled ? 'true' : 'false');
  }
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let isInitialized = false;

export function initFirebase() {
  if (isInitialized) {
    return { app, auth, db };
  }

  const config = getStoredFirebaseConfig();
  const isDemo = isExplicitDemoMode();

  // If in demo mode or placeholder keys, don't throw, create or mock
  if (isDemo || !config.apiKey || config.apiKey.includes('PlaceHolder')) {
    isInitialized = true;
    return { app: null, auth: null, db: null };
  }

  try {
    const existingApps = getApps();
    app = existingApps.length > 0 ? existingApps[0] : initializeApp(config);
    auth = getAuth(app);

    // Hard constraint: enable persistentLocalCache with persistentMultipleTabManager
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
    isInitialized = true;
  } catch (err) {
    console.warn('Firebase initialization note (operating in local persistent mode):', err);
    isInitialized = true;
  }

  return { app, auth, db };
}

export { app, auth, db };
