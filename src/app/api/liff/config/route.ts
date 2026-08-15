import { query } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/liff/config?communityId=xxx
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const communityId = searchParams.get("communityId");

    let liffId = process.env.NEXT_PUBLIC_LIFF_ID || null;

    if (communityId) {
      const result = await query(
        "SELECT line_liff_id FROM communities WHERE id = $1",
        [communityId]
      );
      if (result.rowCount && result.rows[0].line_liff_id) {
        liffId = result.rows[0].line_liff_id;
      }
    } else {
      // If no communityId specified, return the first active community's LIFF ID if exists
      const result = await query(
        "SELECT line_liff_id FROM communities WHERE line_liff_id IS NOT NULL LIMIT 1"
      );
      if (result.rowCount && result.rows[0].line_liff_id) {
        liffId = result.rows[0].line_liff_id;
      }
    }

    return NextResponse.json({ success: true, liffId });
  } catch (err: any) {
    console.error("LIFF Config API Error", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
