"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { initLiff, liff } from "@/lib/line/liff";

interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  email?: string;
}

interface LiffContextType {
  liff: any;
  profile: LineProfile | null;
  loading: boolean;
  error: string | null;
}

const LiffContext = createContext<LiffContextType | undefined>(undefined);

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<LineProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function startLiff() {
      try {
        await initLiff();

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        // Get profile and token
        const lineProfile = await liff.getProfile();
        const idToken = liff.getIDToken();

        if (!active) return;

        if (idToken) {
          // Verify token server-side for security
          const res = await fetch("/api/auth/line", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });

          const data = await res.json();
          if (res.ok && data.profile) {
            setProfile({
              userId: data.profile.sub,
              displayName: data.profile.name || lineProfile.displayName,
              pictureUrl: data.profile.picture || lineProfile.pictureUrl,
              email: data.profile.email,
            });
          } else {
            console.error("Token verification failed, falling back to client profile");
            setProfile({
              userId: lineProfile.userId,
              displayName: lineProfile.displayName,
              pictureUrl: lineProfile.pictureUrl,
            });
          }
        } else {
          setProfile({
            userId: lineProfile.userId,
            displayName: lineProfile.displayName,
            pictureUrl: lineProfile.pictureUrl,
          });
        }
      } catch (err: any) {
        console.error("LIFF initialization error", err);
        if (active) {
          setError(err.message || "ไม่สามารถเชื่อมต่อ LINE LIFF ได้");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    startLiff();

    return () => {
      active = false;
    };
  }, []);

  return (
    <LiffContext.Provider value={{ liff, profile, loading, error }}>
      {children}
    </LiffContext.Provider>
  );
}

export function useLiffContext() {
  const context = useContext(LiffContext);
  if (context === undefined) {
    throw new Error("useLiffContext must be used within a LiffProvider");
  }
  return context;
}
