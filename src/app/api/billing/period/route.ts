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

let multiRoundSchemaEnsured = false;

async function ensureMultiRoundSchema() {
  if (multiRoundSchemaEnsured) return;
  try {
    await query(
      `ALTER TABLE billing_periods
       ADD COLUMN IF NOT EXISTS round_number INTEGER NOT NULL DEFAULT 1,
       ADD COLUMN IF NOT EXISTS round_name TEXT`
    );
    await query(
      `ALTER TABLE billing_periods
       DROP CONSTRAINT IF EXISTS billing_periods_community_id_period_month_period_year_key`
    );
    multiRoundSchemaEnsured = true;
  } catch (err) {
    console.warn("ensureMultiRoundSchema warning (non-fatal):", err);
    multiRoundSchemaEnsured = true;
  }
}

// GET /api/billing/period?month=X&year=Y&periodId=Z
export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureMultiRoundSchema();

    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get("month") || "");
    const year = parseInt(searchParams.get("year") || "");
    const requestedPeriodId = searchParams.get("periodId");

    if (isNaN(month) || isNaN(year)) {
      return NextResponse.json({ error: "รอบบิลไม่ถูกต้อง" }, { status: 400 });
    }

    const communityId = user.communityId;

    // 1. Fetch ALL rounds for this (community, month, year)
    const periodsResult = await query(
      `SELECT * FROM billing_periods
       WHERE community_id = $1 AND period_month = $2 AND period_year = $3
       ORDER BY COALESCE(round_number, 1) ASC, created_at ASC`,
      [communityId, month, year]
    );

    let periods = periodsResult.rows;

    // 2. If no round exists for this month, create Round 1 automatically
    if (periods.length === 0) {
      const insertResult = await query(
        `INSERT INTO billing_periods (community_id, period_month, period_year, round_number, created_by)
         VALUES ($1, $2, $3, 1, $4) RETURNING *`,
        [communityId, month, year, user.userId]
      );
      periods = [insertResult.rows[0]];
    }

    // Select requested round if specified, otherwise the first round (or latest open round)
    let period =
      (requestedPeriodId && periods.find((p) => p.id === requestedPeriodId)) ||
      periods[periods.length - 1];

    if (!period) {
      period = periods[0];
    }

    // 3. Load existing bills for this specific round
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

    // 4. Fetch dynamic previous readings from preceding month
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevPeriodResult = await query(
      `SELECT id FROM billing_periods
       WHERE community_id = $1 AND period_month = $2 AND period_year = $3
       ORDER BY COALESCE(round_number, 1) DESC, created_at DESC LIMIT 1`,
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
      prevItemsResult.rows.forEach((row: Record<string, unknown>) => {
        const hId = String(row.house_id);
        const uType = String(row.utility_type);
        if (!prevReadings[hId]) {
          prevReadings[hId] = {};
        }
        prevReadings[hId][uType] = Number(row.current_reading);
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
    arrearsResult.rows.forEach((row: Record<string, unknown>) => {
      arrearsMap[String(row.house_id)] = {
        total_arrears: Number(row.total_arrears) || 0,
        unpaid_months: Number(row.unpaid_months) || 0,
      };
    });

    return NextResponse.json({
      success: true,
      period,
      periods,
      bills,
      prevReadings,
      arrearsMap,
    });
  } catch (err: unknown) {
    console.error("Billing Period Error", err);
    return NextResponse.json(
      { error: (err instanceof Error ? err.message : undefined) || "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}

// POST /api/billing/period
export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureMultiRoundSchema();

    const {
      action,
      id,
      month,
      year,
      roundName,
      funeralOccurrences,
      funeralEvents,
      isClosed,
      selectedItems,
    } = await req.json();

    // Create an additional round within the same month (e.g., multiple funeral collections)
    if (action === "create_round") {
      const m = parseInt(String(month || ""));
      const y = parseInt(String(year || ""));
      if (isNaN(m) || isNaN(y)) {
        return NextResponse.json({ error: "ระบุเดือน/ปีไม่ถูกต้อง" }, { status: 400 });
      }

      const maxRes = await query(
        `SELECT COALESCE(MAX(COALESCE(round_number, 1)), 0) as max_round
         FROM billing_periods
         WHERE community_id = $1 AND period_month = $2 AND period_year = $3`,
        [user.communityId, m, y]
      );
      const nextRound = Number(maxRes.rows[0]?.max_round || 0) + 1;
      const cleanRoundName = roundName ? String(roundName).trim() : `รอบที่ ${nextRound}`;

      const insertRes = await query(
        `INSERT INTO billing_periods (community_id, period_month, period_year, round_number, round_name, selected_items, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          user.communityId,
          m,
          y,
          nextRound,
          cleanRoundName,
          JSON.stringify(Array.isArray(selectedItems) ? selectedItems : []),
          user.userId,
        ]
      );

      return NextResponse.json({ success: true, period: insertRes.rows[0] });
    }

    if (!id) {
      return NextResponse.json({ error: "ระบุรอบบิลไม่ถูกต้อง" }, { status: 400 });
    }

    if (roundName !== undefined) {
      await query(
        "UPDATE billing_periods SET round_name = $1 WHERE id = $2 AND community_id = $3",
        [roundName ? String(roundName).trim() : null, id, user.communityId]
      );
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
  } catch (err: unknown) {
    console.error("Update Billing Period Error", err);
    return NextResponse.json(
      { error: (err instanceof Error ? err.message : undefined) || "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}
