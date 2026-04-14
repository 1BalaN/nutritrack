import { onAuthStateChanged, signInAnonymously, type Unsubscribe, type User } from 'firebase/auth'
import { auth } from '@/lib/firebase'

let currentUser: User | null = auth.currentUser
let inFlightSignIn: Promise<User> | null = null

onAuthStateChanged(auth, (user) => {
  currentUser = user
})

export async function ensureAuthenticatedUser(): Promise<User> {
  if (currentUser) return currentUser
  if (inFlightSignIn) return inFlightSignIn

  inFlightSignIn = signInAnonymously(auth)
    .then((cred) => {
      currentUser = cred.user
      return cred.user
    })
    .finally(() => {
      inFlightSignIn = null
    })

  return inFlightSignIn
}

export function getAuthenticatedUserId(): string | null {
  return currentUser?.uid ?? null
}

export function subscribeAuthState(listener: (uid: string | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, (user) => listener(user?.uid ?? null))
}
