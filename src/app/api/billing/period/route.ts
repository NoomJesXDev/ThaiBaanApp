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

// GET /api/billing/period?month=X&year=Y
export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get("month") || "");
    const year = parseInt(searchParams.get("year") || "");

    if (isNaN(month) || isNaN(year)) {
      return NextResponse.json({ error: "รอบบิลไม่ถูกต้อง" }, { status: 400 });
    }

    const communityId = user.communityId;

    // 1. Check if period exists
    let periodResult = await query(
      "SELECT * FROM billing_periods WHERE community_id = $1 AND period_month = $2 AND period_year = $3",
      [communityId, month, year]
    );

    let period = periodResult.rows[0];

    // 2. If it doesn't exist, create it
    if (!period) {
      const insertResult = await query(
        `INSERT INTO billing_periods (community_id, period_month, period_year, created_by) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [communityId, month, year, user.userId]
      );
      period = insertResult.rows[0];
    }

    // 3. Load existing bills for this period
    const billsResult = await query(
      "SELECT * FROM bills WHERE billing_period_id = $1",
      [period.id]
    );
    const bills = billsResult.rows;

    if (bills.length > 0) {
      const billIds = bills.map((b) => b.id);
      const itemsResult = await query(
        "SELECT * FROM bill_items WHERE bill_id = ANY($1)",
        [billIds]
      );
      const items = itemsResult.rows;

      bills.forEach((bill) => {
        bill.bill_items = items.filter((item) => item.bill_id === bill.id);
      });
    }

    // 4. Fetch dynamic previous readings from preceding period
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevPeriodResult = await query(
      "SELECT id FROM billing_periods WHERE community_id = $1 AND period_month = $2 AND period_year = $3",
      [communityId, prevMonth, prevYear]
    );
    const prevPeriod = prevPeriodResult.rows[0];
    const prevReadings: Record<string, Record<string, number>> = {};
    if (prevPeriod) {
      const prevItemsResult = await query(
        `SELECT b.house_id, bi.utility_type, bi.current_reading 
         FROM bills b
         JOIN bill_items bi ON b.id = bi.bill_id
         WHERE b.billing_period_id = $1 AND bi.current_reading IS NOT NULL`,
        [prevPeriod.id]
      );
      prevItemsResult.rows.forEach((row: any) => {
        if (!prevReadings[row.house_id]) {
          prevReadings[row.house_id] = {};
        }
        prevReadings[row.house_id][row.utility_type] = Number(row.current_reading);
      });
    }

    // 5. Fetch arrears (unpaid balances from preceding periods)
    const arrearsResult = await query(
      `SELECT b.house_id, COALESCE(SUM(b.total_amount), 0) as total_arrears, COUNT(b.id) as unpaid_months
       FROM bills b
       JOIN billing_periods bp ON b.billing_period_id = bp.id
       WHERE bp.community_id = $1 
         AND (bp.period_year < $2 OR (bp.period_year = $2 AND bp.period_month < $3))
         AND b.status IN ('unpaid', 'overdue')
       GROUP BY b.house_id`,
      [communityId, year, month]
    );
    const arrearsMap: Record<string, { total_arrears: number; unpaid_months: number }> = {};
    arrearsResult.rows.forEach((row: any) => {
      arrearsMap[row.house_id] = {
        total_arrears: Number(row.total_arrears) || 0,
        unpaid_months: Number(row.unpaid_months) || 0,
      };
    });

    return NextResponse.json({ success: true, period, bills, prevReadings, arrearsMap });
  } catch (err: any) {
    console.error("Billing Period Error", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// POST /api/billing/period
export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, funeralOccurrences, funeralEvents, isClosed, selectedItems } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "ระบุรอบบิลไม่ถูกต้อง" }, { status: 400 });
    }

    if (selectedItems !== undefined) {
      await query(
        "UPDATE billing_periods SET selected_items = $1 WHERE id = $2 AND community_id = $3",
        [JSON.stringify(selectedItems), id, user.communityId]
      );
    }

    if (funeralEvents !== undefined) {
      const occurrences = Array.isArray(funeralEvents) ? funeralEvents.length : 0;
      await query(
        "UPDATE billing_periods SET funeral_events = $1, funeral_occurrences = $2 WHERE id = $3 AND community_id = $4",
        [JSON.stringify(funeralEvents), occurrences, id, user.communityId]
      );
    } else if (funeralOccurrences !== undefined) {
      await query(
        "UPDATE billing_periods SET funeral_occurrences = $1 WHERE id = $2 AND community_id = $3",
        [parseInt(funeralOccurrences) || 0, id, user.communityId]
      );
    }

    if (isClosed !== undefined) {
      await query(
        "UPDATE billing_periods SET is_closed = $1 WHERE id = $2 AND community_id = $3",
        [isClosed, id, user.communityId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Update Billing Period Error", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
