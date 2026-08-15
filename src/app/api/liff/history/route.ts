import { query } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/liff/history?houseId=X
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const houseId = searchParams.get("houseId");

    if (!houseId) {
      return NextResponse.json({ error: "Missing houseId" }, { status: 400 });
    }

    // 1. Fetch paid bills for this house
    const billsResult = await query(
      `SELECT b.*, 
              bp.period_month, bp.period_year
       FROM bills b
       JOIN billing_periods bp ON b.billing_period_id = bp.id
       WHERE b.house_id = $1 AND b.status = 'paid'`,
      [houseId]
    );
    const bills = billsResult.rows;

    if (bills.length > 0) {
      const billIds = bills.map((b) => b.id);
      
      // 2. Fetch bill items
      const itemsResult = await query(
        "SELECT id, bill_id, utility_type, amount FROM bill_items WHERE bill_id = ANY($1)",
        [billIds]
      );
      const items = itemsResult.rows;

      // 3. Fetch payments
      const paymentsResult = await query(
        "SELECT id, bill_id, paid_at, verified_at FROM payments WHERE bill_id = ANY($1)",
        [billIds]
      );
      const payments = paymentsResult.rows;

      bills.forEach((bill) => {
        bill.billing_periods = {
          period_month: bill.period_month,
          period_year: bill.period_year
        };
        bill.bill_items = items.filter((item) => item.bill_id === bill.id);
        bill.payments = payments.filter((payment) => payment.bill_id === bill.id);
      });
    }

    return NextResponse.json({ success: true, bills });
  } catch (err: any) {
    console.error("LIFF History Error", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
