import { query } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/liff/search-house?communityId=X&houseNumber=Y
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const communityId = searchParams.get("communityId");
    const houseNumber = searchParams.get("houseNumber");

    if (!communityId || !houseNumber) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
    }

    const result = await query(
      `SELECT h.*, c.name as community_name 
       FROM houses h
       JOIN communities c ON h.community_id = c.id
       WHERE h.community_id = $1 AND h.house_number = $2 AND h.is_active = true`,
      [communityId, houseNumber.trim()]
    );

    const house = result.rows[0];
    if (house) {
      return NextResponse.json({
        success: true,
        found: true,
        data: {
          id: house.id,
          house_number: house.house_number,
          owner_name: house.owner_name,
          community_id: house.community_id,
          communities: {
            id: house.community_id,
            name: house.community_name
          }
        }
      });
    }

    return NextResponse.json({ success: true, found: false });
  } catch (err: any) {
    console.error("Search House Error", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
