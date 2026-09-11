import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getStorage, Storage } from 'firebase-admin/storage';
import { getEnv } from './env';

declare global {
  var _firebaseApp: App | undefined;
  var _firestoreDb: Firestore | undefined;
  var _firebaseAuth: Auth | undefined;
  var _firebaseStorage: Storage | undefined;
}

export function getAdminApp(): App {
  if (globalThis._firebaseApp) return globalThis._firebaseApp;

  const env = getEnv();
  const existingApps = getApps();

  if (existingApps.length > 0) {
    globalThis._firebaseApp = existingApps[0];
    return globalThis._firebaseApp;
  }

  // Si estamos en entorno de emulador o desarrollo sin credencial privada completa
  if (env.FIRESTORE_EMULATOR_HOST || !env.FIREBASE_PRIVATE_KEY) {
    globalThis._firebaseApp = initializeApp({
      projectId: env.FIREBASE_PROJECT_ID,
      storageBucket: env.FIREBASE_STORAGE_BUCKET,
    });
  } else {
    // Producción con credenciales de servicio
    const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    globalThis._firebaseApp = initializeApp({
      credential: cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
      storageBucket: env.FIREBASE_STORAGE_BUCKET,
    });
  }

  return globalThis._firebaseApp;
}

export function getAdminDb(): Firestore {
  if (!globalThis._firestoreDb) {
    const app = getAdminApp();
    const db = getFirestore(app);
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch {
      // Ignorar si ya fue inicializado por otro módulo/recarga HMR
    }
    globalThis._firestoreDb = db;
  }
  return globalThis._firestoreDb;
}

export function getAdminAuth(): Auth {
  if (!globalThis._firebaseAuth) {
    const app = getAdminApp();
    globalThis._firebaseAuth = getAuth(app);
  }
  return globalThis._firebaseAuth;
}

export function getAdminStorage(): Storage {
  if (!globalThis._firebaseStorage) {
    const app = getAdminApp();
    globalThis._firebaseStorage = getStorage(app);
  }
  return globalThis._firebaseStorage;
}
