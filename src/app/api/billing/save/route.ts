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

// POST /api/billing/save
export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, billingPeriodId, houseId, totalAmount, arrearsAmount, status, items } = await req.json();

    if (!billingPeriodId || !houseId || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
    }

    let billId = id;

    // Begin simulated transaction (simple sequential queries since we are single operations)
    if (billId) {
      // Update
      await query(
        `UPDATE bills 
         SET total_amount = $1, arrears_amount = $2, status = $3, updated_at = NOW() 
         WHERE id = $4`,
        [totalAmount, arrearsAmount || 0, status, billId]
      );
    } else {
      // Insert
      const insertResult = await query(
        `INSERT INTO bills (billing_period_id, house_id, total_amount, arrears_amount, status) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [billingPeriodId, houseId, totalAmount, arrearsAmount || 0, status]
      );
      billId = insertResult.rows[0].id;
    }

    // Delete existing bill items
    await query("DELETE FROM bill_items WHERE bill_id = $1", [billId]);

    // Insert new bill items
    for (const item of items) {
      await query(
        `INSERT INTO bill_items (bill_id, utility_type, previous_reading, current_reading, units_used, amount) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          billId,
          item.utility_type,
          item.previous_reading !== undefined ? item.previous_reading : null,
          item.current_reading !== undefined ? item.current_reading : null,
          item.units_used !== undefined ? item.units_used : null,
          item.amount
        ]
      );
    }

    return NextResponse.json({ success: true, billId });
  } catch (err: any) {
    console.error("Save Bill Error", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
