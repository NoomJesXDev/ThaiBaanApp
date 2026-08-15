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

// GET /api/admin/dashboard
export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const communityId = user.communityId;
    const currentYear = new Date().getFullYear();

    // 1. Overall Stats
    const statsResult = await query(
      `SELECT 
        COALESCE(SUM(CASE WHEN b.status = 'paid' THEN b.total_amount ELSE 0 END), 0) as total_collected,
        COALESCE(SUM(CASE WHEN b.status IN ('unpaid', 'overdue') THEN b.total_amount ELSE 0 END), 0) as total_outstanding,
        COALESCE(SUM(b.total_amount), 0) as total_billed,
        COUNT(CASE WHEN b.status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN b.status IN ('unpaid', 'overdue') THEN 1 END) as unpaid_count,
        COUNT(b.id) as total_bills
       FROM bills b
       JOIN billing_periods bp ON b.billing_period_id = bp.id
       WHERE bp.community_id = $1`,
      [communityId]
    );
    const stats = statsResult.rows[0];

    // 2. Revenue breakdown by Category / Utility Type (Paid only)
    const categoryResult = await query(
      `SELECT 
        bi.utility_type,
        COALESCE(ur.name, 
          CASE 
            WHEN bi.utility_type = 'water' THEN 'ค่าน้ำประปา'
            WHEN bi.utility_type = 'garbage' THEN 'ค่าเก็บขยะ'
            WHEN bi.utility_type = 'funeral' THEN 'เงินสงเคราะห์ฌาปนกิจ'
            ELSE bi.utility_type 
          END
        ) as category_name,
        COALESCE(SUM(bi.amount), 0) as total_amount,
        COUNT(bi.id) as item_count
       FROM bill_items bi
       JOIN bills b ON bi.bill_id = b.id
       JOIN billing_periods bp ON b.billing_period_id = bp.id
       LEFT JOIN utility_rates ur ON bi.utility_type = ur.utility_type AND ur.community_id = $1
       WHERE bp.community_id = $1 AND b.status = 'paid'
       GROUP BY bi.utility_type, category_name
       ORDER BY total_amount DESC`,
      [communityId]
    );

    // 3. Monthly Trend for current year
    const monthlyResult = await query(
      `SELECT 
        bp.period_month,
        COALESCE(SUM(CASE WHEN b.status = 'paid' THEN b.total_amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN b.status IN ('unpaid', 'overdue') THEN b.total_amount ELSE 0 END), 0) as unpaid_amount,
        COUNT(b.id) as bills_count
       FROM billing_periods bp
       LEFT JOIN bills b ON bp.id = b.billing_period_id
       WHERE bp.community_id = $1 AND bp.period_year = $2
       GROUP BY bp.period_month
       ORDER BY bp.period_month ASC`,
      [communityId, currentYear]
    );

    // 4. Defaulters List (Houses with outstanding unpaid bills)
    const defaultersResult = await query(
      `SELECT 
        h.id as house_id,
        h.house_number,
        h.owner_name,
        h.water_meter_id,
        COUNT(b.id) as unpaid_months,
        COALESCE(SUM(b.total_amount), 0) as total_arrears,
        MAX(bp.period_year) as latest_year,
        MAX(bp.period_month) as latest_month
       FROM houses h
       JOIN bills b ON h.id = b.house_id
       JOIN billing_periods bp ON b.billing_period_id = bp.id
       WHERE h.community_id = $1 AND b.status IN ('unpaid', 'overdue')
       GROUP BY h.id, h.house_number, h.owner_name, h.water_meter_id
       ORDER BY total_arrears DESC, unpaid_months DESC`,
      [communityId]
    );

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalCollected: Number(stats.total_collected),
          totalOutstanding: Number(stats.total_outstanding),
          totalBilled: Number(stats.total_billed),
          paidCount: Number(stats.paid_count),
          unpaidCount: Number(stats.unpaid_count),
          totalBills: Number(stats.total_bills),
          collectionRate: Number(stats.total_billed) > 0 
            ? Math.round((Number(stats.total_collected) / Number(stats.total_billed)) * 100) 
            : 0
        },
        categoryBreakdown: categoryResult.rows.map((row: any) => ({
          utilityType: row.utility_type,
          name: row.category_name,
          totalAmount: Number(row.total_amount),
          itemCount: Number(row.item_count)
        })),
        monthlyTrends: monthlyResult.rows.map((row: any) => ({
          month: Number(row.period_month),
          paidAmount: Number(row.paid_amount),
          unpaidAmount: Number(row.unpaid_amount),
          billsCount: Number(row.bills_count)
        })),
        defaulters: defaultersResult.rows.map((row: any) => ({
          houseId: row.house_id,
          houseNumber: row.house_number,
          ownerName: row.owner_name || "-",
          meterId: row.water_meter_id || "-",
          unpaidMonths: Number(row.unpaid_months),
          totalArrears: Number(row.total_arrears)
        }))
      }
    });
  } catch (err: any) {
    console.error("Dashboard API Error", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
