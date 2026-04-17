import { initializeApp, getApps } from 'firebase/app'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as FirebaseAuth from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

function createAuth() {
  const getReactNativePersistence = (
    FirebaseAuth as unknown as {
      getReactNativePersistence?: (storage: typeof AsyncStorage) => unknown
    }
  ).getReactNativePersistence

  try {
    if (getReactNativePersistence) {
      const persistence = getReactNativePersistence(AsyncStorage)
      return FirebaseAuth.initializeAuth(app, {
        persistence: persistence as FirebaseAuth.Persistence,
      })
    }
    return FirebaseAuth.getAuth(app)
  } catch {
    // Fallback for environments where auth has been initialized already.
    return FirebaseAuth.getAuth(app)
  }
}

export const auth = createAuth()
export const firestore = getFirestore(app)

export default app
