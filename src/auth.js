import {
  signInWithPopup, signInWithRedirect, getRedirectResult,
  GoogleAuthProvider, GithubAuthProvider, OAuthProvider,
  linkWithCredential, unlink,
  onAuthStateChanged, signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth } from './firebase'

const googleProvider = new GoogleAuthProvider()
const githubProvider = new GithubAuthProvider()
const appleProvider = new OAuthProvider('apple.com')
const discordProvider = new OAuthProvider('discord.com')
discordProvider.addScope('identify')

const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

export function onAuthChange(callback) {
  if (!auth) return () => {}
  return onAuthStateChanged(auth, callback)
}

export async function signInWithGoogle() {
  if (!auth) return null
  if (isMobile()) return signInWithRedirect(auth, googleProvider)
  return signInWithPopup(auth, googleProvider)
}

export async function signInWithGitHub() {
  if (!auth) return null
  if (isMobile()) return signInWithRedirect(auth, githubProvider)
  return signInWithPopup(auth, githubProvider)
}

export async function signInWithApple() {
  if (!auth) return null
  if (isMobile()) return signInWithRedirect(auth, appleProvider)
  return signInWithPopup(auth, appleProvider)
}

export async function signInWithDiscord() {
  if (!auth) return null
  if (isMobile()) return signInWithRedirect(auth, discordProvider)
  return signInWithPopup(auth, discordProvider)
}

export async function handleRedirectResult() {
  if (!auth) return null
  try {
    return await getRedirectResult(auth)
  } catch (e) {
    console.warn('Redirect result error:', e)
    return null
  }
}

export async function signOut() {
  if (!auth) return
  await firebaseSignOut(auth)
}
