import { getAuthInstance } from './firebase'

const ADMIN_EMAIL = 'admin@offlinearcade.app'
const ADMIN_PASSWORD = 'Arc@deAdm1n!2024'

const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

export async function onAuthChange(callback) {
  const auth = await getAuthInstance()
  if (!auth) return () => {}
  const { onAuthStateChanged } = await import('firebase/auth')
  return onAuthStateChanged(auth, callback)
}

export async function signInWithGoogle() {
  const auth = await getAuthInstance()
  if (!auth) return null
  const { signInWithPopup, signInWithRedirect, GoogleAuthProvider } = await import('firebase/auth')
  const provider = new GoogleAuthProvider()
  if (isMobile()) return signInWithRedirect(auth, provider)
  return signInWithPopup(auth, provider)
}

export async function signInWithGitHub() {
  const auth = await getAuthInstance()
  if (!auth) return null
  const { signInWithPopup, signInWithRedirect, GithubAuthProvider } = await import('firebase/auth')
  const provider = new GithubAuthProvider()
  if (isMobile()) return signInWithRedirect(auth, provider)
  return signInWithPopup(auth, provider)
}

export async function signInWithApple() {
  const auth = await getAuthInstance()
  if (!auth) return null
  const { signInWithPopup, signInWithRedirect, OAuthProvider } = await import('firebase/auth')
  const provider = new OAuthProvider('apple.com')
  if (isMobile()) return signInWithRedirect(auth, provider)
  return signInWithPopup(auth, provider)
}

export async function signInWithDiscord() {
  const auth = await getAuthInstance()
  if (!auth) return null
  const { signInWithPopup, signInWithRedirect, OAuthProvider } = await import('firebase/auth')
  const provider = new OAuthProvider('discord.com')
  provider.addScope('identify')
  if (isMobile()) return signInWithRedirect(auth, provider)
  return signInWithPopup(auth, provider)
}

export async function signInWithMicrosoft() {
  const auth = await getAuthInstance()
  if (!auth) return null
  const { signInWithPopup, signInWithRedirect, OAuthProvider } = await import('firebase/auth')
  const provider = new OAuthProvider('microsoft.com')
  if (isMobile()) return signInWithRedirect(auth, provider)
  return signInWithPopup(auth, provider)
}

export async function handleRedirectResult() {
  const auth = await getAuthInstance()
  if (!auth) return null
  const { getRedirectResult } = await import('firebase/auth')
  try {
    return await getRedirectResult(auth)
  } catch (e) {
    console.warn('Redirect result error:', e)
    return null
  }
}

export async function signOut() {
  const auth = await getAuthInstance()
  if (!auth) return
  const { signOut: firebaseSignOut } = await import('firebase/auth')
  await firebaseSignOut(auth)
}

export async function signInAsAdmin() {
  const auth = await getAuthInstance()
  if (!auth) return null
  const { signOut: firebaseSignOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import('firebase/auth')
  await firebaseSignOut(auth)
  try {
    const cred = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD)
    return cred.user
  } catch (e) {
    if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
      try {
        const cred = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD)
        return cred.user
      } catch (e2) {
        console.warn('Admin account creation failed:', e2.code)
        return null
      }
    }
    console.warn('Admin sign-in failed:', e.code)
    return null
  }
}
