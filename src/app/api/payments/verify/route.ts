import { query } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import { NextResponse } from "next/server";

async function getAuthUser(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/session=([^;]+)/);
  const token = match ? match[1] : null;
  if (!token) return null;
  return verifyJWT(token);
}

// POST /api/payments/verify
export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { paymentId, billId, isApproved, note } = await req.json();

    if (!paymentId || !billId) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
    }

    if (isApproved) {
      // 1. Update Payment row
      await query(
        `UPDATE payments 
         SET verified_at = NOW(), verified_by = $1 
         WHERE id = $2`,
        [user.userId, paymentId]
      );

      // 2. Update Bill status
      await query(
        `UPDATE bills 
         SET status = 'paid', updated_at = NOW() 
         WHERE id = $1`,
        [billId]
      );

      // 3. Send approval LINE message (internally fetch absolute/relative notification endpoint)
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        await fetch(`${appUrl}/api/line/notify-verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            billId: billId,
            status: "approved",
          }),
        });
      } catch (lineErr) {
        console.error("LINE Notify Error", lineErr);
      }

      return NextResponse.json({ success: true, message: "ยืนยันยอดเงินสำเร็จ" });
    } else {
      // Reject
      // 1. Delete Payment row (so they can upload again)
      await query("DELETE FROM payments WHERE id = $1", [paymentId]);

      // 2. Reset Bill status to unpaid
      await query(
        `UPDATE bills 
         SET status = 'unpaid', updated_at = NOW() 
         WHERE id = $1`,
        [billId]
      );

      // 3. Send rejection LINE message
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        await fetch(`${appUrl}/api/line/notify-verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            billId: billId,
            status: "rejected",
            note: note || "หลักฐานการชำระเงินไม่ถูกต้อง",
          }),
        });
      } catch (lineErr) {
        console.error("LINE Notify Error", lineErr);
      }

      return NextResponse.json({ success: true, message: "ปฏิเสธสลิปการชำระเงินและแจ้งเตือนลูกบ้านแล้ว" });
    }
  } catch (err: any) {
    console.error("Verify Payment Error", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
