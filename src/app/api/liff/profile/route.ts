import { query } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/liff/profile?lineUserId=X
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lineUserId = searchParams.get("lineUserId");

    if (!lineUserId) {
      return NextResponse.json({ error: "Missing lineUserId" }, { status: 400 });
    }

    // 1. Get linked house member record
    const memberResult = await query(
      `SELECT hm.id as member_id, hm.house_id, hm.line_user_id,
              h.house_number, h.owner_name, h.community_id,
              c.name as community_name
       FROM house_members hm
       JOIN houses h ON hm.house_id = h.id
       JOIN communities c ON h.community_id = c.id
       WHERE hm.line_user_id = $1`,
      [lineUserId]
    );

    const member = memberResult.rows[0];

    if (member) {
      return NextResponse.json({
        success: true,
        registered: true,
        data: {
          id: member.member_id,
          house_id: member.house_id,
          line_user_id: member.line_user_id,
          houses: {
            id: member.house_id,
            house_number: member.house_number,
            owner_name: member.owner_name,
            community_id: member.community_id,
            communities: {
              id: member.community_id,
              name: member.community_name
            }
          }
        }
      });
    }

    // 2. If not registered, fetch communities to present in register form
    const communitiesResult = await query(
      "SELECT id, name FROM communities ORDER BY name ASC"
    );

    return NextResponse.json({
      success: true,
      registered: false,
      communities: communitiesResult.rows
    });
  } catch (err: any) {
    console.error("LIFF Profile Error", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
