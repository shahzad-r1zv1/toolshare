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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initError) {
      setError(initError);
      setLoading(false);
      return;
    }
    if (!auth) {
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
          setLoading(false);
          setError("Authentication service unavailable. Please check your configuration.");
        }
      );
      return unsubscribe;
    } catch (err) {
      console.error("Failed to initialize auth listener:", err);
      setLoading(false);
      setError("Authentication service unavailable. Please check your configuration.");
    }
  }, []);

  const signInWithGoogle = async () => {
    if (!auth || !googleProvider) {
      setError("Authentication is not configured.");
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
    if (!auth) return;
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
