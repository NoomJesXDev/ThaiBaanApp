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

// POST - Create a new house
export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { communityId, houseNumber, ownerName, waterMeterId } = await req.json();

    if (!houseNumber) {
      return NextResponse.json({ error: "กรุณาระบุบ้านเลขที่" }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO houses (community_id, house_number, owner_name, water_meter_id) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [communityId || user.communityId, houseNumber, ownerName || null, waterMeterId || null]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error("Create House Error", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// PUT - Update a house
export async function PUT(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, houseNumber, ownerName, waterMeterId } = await req.json();

    if (!id || !houseNumber) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
    }

    const result = await query(
      `UPDATE houses 
       SET house_number = $1, owner_name = $2, water_meter_id = $3, updated_at = NOW() 
       WHERE id = $4 RETURNING *`,
      [houseNumber, ownerName || null, waterMeterId || null, id]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error("Update House Error", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// DELETE - Remove a house
export async function DELETE(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { url } = req;
    const { searchParams } = new URL(url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing house id" }, { status: 400 });
    }

    await query("DELETE FROM houses WHERE id = $1", [id]);

    return NextResponse.json({ success: true, message: "ลบบ้านเลขที่สำเร็จ" });
  } catch (err: any) {
    console.error("Delete House Error", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
