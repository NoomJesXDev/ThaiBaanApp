'use client';

import liff from '@line/liff';

let liffInitialized = false;

export async function initLiff() {
  if (liffInitialized) return;
  if (!process.env.NEXT_PUBLIC_LIFF_ID) {
    console.error("NEXT_PUBLIC_LIFF_ID is not configured");
    return;
  }
  try {
    await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID });
    liffInitialized = true;
  } catch (error) {
    console.error("Failed to initialize LIFF", error);
  }
}

export { liff };
