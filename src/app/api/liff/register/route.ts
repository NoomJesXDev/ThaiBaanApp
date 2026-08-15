import { query } from "@/lib/db";
import { NextResponse } from "next/server";

// POST /api/liff/register
export async function POST(req: Request) {
  try {
    const { lineUserId, displayName, pictureUrl, houseId, communityId, houseNumber, ownerName } = await req.json();

    if (!lineUserId || !houseId) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
    }

    let targetHouseId = houseId;

    // 1. Check if house number is already registered in this community if adding a new house
    if (houseId === "NEW") {
      if (!houseNumber || !communityId || !ownerName) {
        return NextResponse.json({ error: "กรุณากรอกข้อมูลบ้านเลขที่ให้ครบถ้วน" }, { status: 400 });
      }

      // Check if house_number already exists
      const checkHouse = await query(
        "SELECT id FROM houses WHERE community_id = $1 AND house_number = $2",
        [communityId, houseNumber.trim()]
      );

      if (checkHouse.rowCount && checkHouse.rowCount > 0) {
        targetHouseId = checkHouse.rows[0].id;
      } else {
        // Insert new house
        const insertHouseResult = await query(
          `INSERT INTO houses (community_id, house_number, owner_name) 
           VALUES ($1, $2, $3) RETURNING id`,
          [communityId, houseNumber.trim(), ownerName.trim()]
        );
        targetHouseId = insertHouseResult.rows[0].id;
      }
    }

    // 2. Check if this LINE User ID is already linked to some house
    const checkLink = await query(
      "SELECT id FROM house_members WHERE line_user_id = $1",
      [lineUserId]
    );

    if (checkLink.rowCount && checkLink.rowCount > 0) {
      // Update the link
      await query(
        `UPDATE house_members 
         SET house_id = $1, display_name = $2, picture_url = $3 
         WHERE line_user_id = $4`,
        [targetHouseId, displayName || null, pictureUrl || null, lineUserId]
      );
    } else {
      // Create new link
      await query(
        `INSERT INTO house_members (house_id, line_user_id, display_name, picture_url, is_primary) 
         VALUES ($1, $2, $3, $4, $5)`,
        [targetHouseId, lineUserId, displayName || null, pictureUrl || null, true]
      );
    }

    return NextResponse.json({ success: true, message: "ผูกบัญชี LINE กับบ้านเลขที่สำเร็จ" });
  } catch (err: any) {
    console.error("LIFF Register Error", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// DELETE /api/liff/register?memberId=X
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json({ error: "Missing memberId" }, { status: 400 });
    }

    await query("DELETE FROM house_members WHERE id = $1", [memberId]);

    return NextResponse.json({ success: true, message: "ยกเลิกการเชื่อมโยงบัญชีสำเร็จ" });
  } catch (err: any) {
    console.error("LIFF Unlink Error", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
