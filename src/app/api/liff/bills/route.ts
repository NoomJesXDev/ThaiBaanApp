import { query } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/liff/bills?houseId=X&billId=Y
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const houseId = searchParams.get("houseId");
    const billId = searchParams.get("billId");

    if (!houseId) {
      return NextResponse.json({ error: "Missing houseId" }, { status: 400 });
    }

    let billsResult;
    if (billId) {
      // Fetch specific bill
      billsResult = await query(
        `SELECT b.*, 
                bp.period_month, bp.period_year, bp.is_closed, bp.funeral_events
         FROM bills b
         JOIN billing_periods bp ON b.billing_period_id = bp.id
         WHERE b.house_id = $1 AND b.id = $2`,
        [houseId, billId]
      );
    } else {
      // Fetch active unpaid or pending bills
      billsResult = await query(
        `SELECT b.*, 
                bp.period_month, bp.period_year, bp.is_closed, bp.funeral_events
         FROM bills b
         JOIN billing_periods bp ON b.billing_period_id = bp.id
         WHERE b.house_id = $1 AND b.status IN ('unpaid', 'pending_verify')`,
        [houseId]
      );
    }

    const bills = billsResult.rows;

    if (bills.length > 0) {
      const billIds = bills.map((b) => b.id);
      const itemsResult = await query(
        `SELECT bi.id, bi.bill_id, bi.utility_type, bi.previous_reading, bi.current_reading, bi.units_used, bi.amount,
                COALESCE(ur.name, CASE WHEN bi.utility_type = 'water' THEN 'ค่าน้ำประปา' WHEN bi.utility_type = 'garbage' THEN 'ค่าเก็บขยะ' WHEN bi.utility_type = 'funeral' THEN 'เงินสงเคราะห์ฌาปนกิจ' ELSE bi.utility_type END) as name,
                COALESCE(ur.is_metered, bi.previous_reading IS NOT NULL) as is_metered
         FROM bill_items bi
         LEFT JOIN utility_rates ur ON bi.utility_type = ur.utility_type
         WHERE bi.bill_id = ANY($1)`,
        [billIds]
      );
      const items = itemsResult.rows;

      bills.forEach((bill) => {
        bill.billing_periods = {
          period_month: bill.period_month,
          period_year: bill.period_year,
          is_closed: bill.is_closed,
          funeral_events: bill.funeral_events
        };
        bill.bill_items = items.filter((item) => item.bill_id === bill.id);
      });
    }

    return NextResponse.json({ success: true, bills });
  } catch (err: any) {
    console.error("LIFF Bills Error", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
