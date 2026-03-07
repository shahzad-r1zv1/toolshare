"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import { auth, googleProvider, initError } from "./firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  error: null,
  signInWithGoogle: async () => {},
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initError || !auth) {
      setUser(DEV_USER);
      setLoading(false);
      return;
    }
    try {
      const unsubscribe = onAuthStateChanged(
        auth,
        (firebaseUser) => {
          setUser(firebaseUser);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error("Auth state error:", err);
          setUser(DEV_USER);
          setLoading(false);
        }
      );
      return unsubscribe;
    } catch (err) {
      console.error("Failed to initialize auth listener:", err);
      setUser(DEV_USER);
      setLoading(false);
    }
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
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        console.error("Google sign-in failed:", error);
        setError("Sign-in failed. Please try again.");
      }
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
    <AuthContext.Provider value={{ user, loading, error, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
