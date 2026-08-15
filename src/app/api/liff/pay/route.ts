import { query } from "@/lib/db";
import { NextResponse } from "next/server";

// POST /api/liff/pay
export async function POST(req: Request) {
  try {
    const { billId, houseId, amount, slipImageUrl, note } = await req.json();

    if (!billId || !houseId || !amount || !slipImageUrl) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
    }

    // 1. Insert into payments
    await query(
      `INSERT INTO payments (bill_id, house_id, amount, slip_image_url, note, paid_at) 
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [billId, houseId, amount, slipImageUrl, note ? note.trim() : null]
    );

    // 2. Update bill status to pending_verify
    await query(
      `UPDATE bills 
       SET status = 'pending_verify', updated_at = NOW() 
       WHERE id = $1`,
      [billId]
    );

    return NextResponse.json({ success: true, message: "แจ้งชำระเงินและแนบหลักฐานสลิปสำเร็จ" });
  } catch (err: any) {
    console.error("LIFF Pay Error", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
