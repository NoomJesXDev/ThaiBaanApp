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
      
      // 2. Fetch bill items with readable names
      const itemsResult = await query(
        `SELECT bi.id, bi.bill_id, bi.utility_type, bi.amount, bi.previous_reading, bi.current_reading, bi.units_used,
                COALESCE(ur.name, CASE 
                  WHEN bi.utility_type = 'water' THEN 'ค่าน้ำประปา'
                  WHEN bi.utility_type = 'garbage' THEN 'ค่าเก็บขยะ'
                  WHEN bi.utility_type = 'funeral' THEN 'เงินสงเคราะห์ฌาปนกิจ'
                  ELSE bi.utility_type
                END) as name,
                COALESCE(ur.is_metered, bi.previous_reading IS NOT NULL) as is_metered
         FROM bill_items bi
         LEFT JOIN utility_rates ur ON bi.utility_type = ur.utility_type
         WHERE bi.bill_id = ANY($1)`,
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
