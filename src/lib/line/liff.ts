'use client';

import liff from '@line/liff';

let liffInitialized = false;

export async function initLiff(customLiffId?: string) {
  if (liffInitialized) return;
  const targetLiffId = customLiffId || process.env.NEXT_PUBLIC_LIFF_ID;
  if (!targetLiffId) {
    console.error("LIFF ID is not configured");
    return;
  }
  try {
    await liff.init({ liffId: targetLiffId });
    liffInitialized = true;
  } catch (error) {
    console.error("Failed to initialize LIFF", error);
    throw error;
  }
}

export { liff };
