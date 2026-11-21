import { query } from "@/lib/db";
import { isEmailConfigured, sendNewPaymentSlipEmail } from "@/lib/email";
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

    // 3. Notify active community staff via email (non-blocking)
    if (isEmailConfigured()) {
      void (async () => {
        try {
          const infoRes = await query(
            `SELECT h.house_number, h.owner_name, h.community_id, c.name AS community_name
             FROM houses h
             JOIN communities c ON h.community_id = c.id
             WHERE h.id = $1`,
            [houseId]
          );
          if (infoRes.rowCount && infoRes.rowCount > 0) {
            const info = infoRes.rows[0];
            const staffRes = await query(
              `SELECT email FROM staff WHERE community_id = $1 AND is_active = true AND email IS NOT NULL`,
              [info.community_id]
            );
            const emails = staffRes.rows
              .map((r: Record<string, unknown>) => String(r.email || "").trim())
              .filter(Boolean);

            if (emails.length > 0) {
              const appUrl = (
                process.env.NEXT_PUBLIC_APP_URL || "https://thaibaanapp-gold.vercel.app"
              ).replace(/\/$/, "");
              await sendNewPaymentSlipEmail(emails, {
                communityName: String(info.community_name || "ชุมชน"),
                houseNumber: String(info.house_number || "-"),
                ownerName: String(info.owner_name || "-"),
                amount: Number(amount),
                verifyUrl: `${appUrl}/admin/payments`,
              });
            }
          }
        } catch (emailErr) {
          console.error("Failed to send payment slip email notification:", emailErr);
        }
      })();
    }

    return NextResponse.json({ success: true, message: "แจ้งชำระเงินและแนบหลักฐานสลิปสำเร็จ" });
  } catch (err: unknown) {
    console.error("LIFF Pay Error", err);
    return NextResponse.json(
      { error: (err instanceof Error ? err.message : undefined) || "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}
