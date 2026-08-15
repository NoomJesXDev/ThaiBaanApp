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
  isMock: boolean;
}

const LiffContext = createContext<LiffContextType | undefined>(undefined);

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<LineProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);

  useEffect(() => {
    let active = true;

    async function startLiff() {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

      // 1. If LIFF ID is not provided or running on PC browser without LIFF, fallback to Test/Mock mode
      if (!liffId || liffId.trim() === "") {
        console.warn("NEXT_PUBLIC_LIFF_ID not set. Running in Browser Simulator Mode.");
        if (active) {
          setIsMock(true);
          setProfile({
            userId: "U_MOCK_RESIDENT_TESTER",
            displayName: "ผู้ทดสอบระบบ (จำลอง LINE)",
            pictureUrl: "",
          });
          setLoading(false);
        }
        return;
      }

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
        console.error("LIFF initialization error, falling back to mock mode:", err);
        if (active) {
          // Graceful fallback to simulator on PC
          setIsMock(true);
          setProfile({
            userId: "U_MOCK_RESIDENT_TESTER",
            displayName: "ผู้ทดสอบระบบ (จำลอง LINE)",
            pictureUrl: "",
          });
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
    <LiffContext.Provider value={{ liff, profile, loading, error, isMock }}>
      {isMock && (
        <div className="bg-amber-500 text-white text-[11px] font-semibold py-1 px-3 text-center sticky top-0 z-50 shadow-xs flex items-center justify-center gap-1.5">
          <span>⚡ โหมดจำลอง LINE บนเบราว์เซอร์ (PC Simulator Mode)</span>
        </div>
      )}
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
