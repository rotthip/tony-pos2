import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  type Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const existingApps = getApps();
export const app: FirebaseApp = existingApps.length > 0 ? existingApps[0] : initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Cloud Firestore using the database ID from firebase-applet-config.json
export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Test Firestore connection on application boot as required by system skill
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline notice. Offline cache will handle operations.');
    }
    return false;
  }
}

// Run test on load
testFirestoreConnection().catch(() => {});
