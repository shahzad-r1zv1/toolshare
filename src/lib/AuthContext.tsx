"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import { auth, googleProvider, initError } from "./firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  /** True when Firebase isn't configured and we're using a local demo user. */
  offlineMode: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  error: null,
  offlineMode: false,
  signInWithGoogle: async () => {},
  signUpWithEmail: async () => {},
  signInWithEmail: async () => {},
  resetPassword: async () => {},
  signOut: async () => {},
});

const DEV_USER: User = {
  uid: "dev-user",
  email: "dev@toolshare.local",
  displayName: "Dev User",
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  providerId: "dev",
  metadata: {} as User["metadata"],
  providerData: [],
  refreshToken: "",
  tenantId: null,
  phoneNumber: null,
  delete: async () => {},
  getIdToken: async () => "",
  getIdTokenResult: async () => ({} as Awaited<ReturnType<User["getIdTokenResult"]>>),
  reload: async () => {},
  toJSON: () => ({}),
};

/** Translate Firebase auth error codes into messages a person can act on. */
function friendlyAuthError(error: unknown): string {
  const code = (error as { code?: string }).code || "";
  switch (code) {
    case "auth/invalid-email":
      return "That email address doesn't look valid.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/weak-password":
      return "Password is too weak — use at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a minute and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Allow popups and try again.";
    case "auth/unauthorized-domain":
      return "This domain isn't authorized in Firebase. Add it under Authentication → Settings → Authorized domains.";
    case "auth/operation-not-allowed":
      return "This sign-in method isn't enabled in Firebase. Enable it under Authentication → Sign-in method.";
    default:
      console.error("Auth error:", error);
    return "Something went wrong. Please try again.";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const offlineMode = Boolean(initError) || !auth;

  useEffect(() => {
    if (!auth) {
      // Firebase not configured: run as a local demo user so the app is
      // still usable for development and offline evaluation.
      setUser(DEV_USER);
      setLoading(false);
      return;
    }
    // Completes Google sign-in on browsers where we fell back to redirect.
    getRedirectResult(auth).catch((err) => {
      const code = (err as { code?: string }).code;
      if (code && code !== "auth/no-auth-event") {
        setError(friendlyAuthError(err));
      }
    });
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        setUser(firebaseUser);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Auth state error:", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    if (!auth || !googleProvider) {
      setUser(DEV_USER);
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        return;
      }
      if (code === "auth/popup-blocked") {
        // Mobile browsers often block popups; redirect flow works there.
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw new Error(friendlyAuthError(error));
    }
  };

  const signUpWithEmail = async (name: string, email: string, password: string) => {
    if (!auth) {
      setUser(DEV_USER);
      return;
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
        // Re-emit the user so the UI picks up the display name immediately.
        setUser({ ...cred.user, displayName: name.trim() } as User);
      }
    } catch (error: unknown) {
      throw new Error(friendlyAuthError(error));
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!auth) {
      setUser(DEV_USER);
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: unknown) {
      throw new Error(friendlyAuthError(error));
    }
  };

  const resetPassword = async (email: string) => {
    if (!auth) return;
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: unknown) {
      throw new Error(friendlyAuthError(error));
    }
  };

  const signOut = async () => {
    if (!auth) {
      setUser(DEV_USER);
      return;
    }
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Sign-out failed:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        offlineMode,
        signInWithGoogle,
        signUpWithEmail,
        signInWithEmail,
        resetPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
