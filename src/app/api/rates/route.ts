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

// GET - Retrieve all active rates for the community
export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await query(
      "SELECT * FROM utility_rates WHERE community_id = $1 AND is_active = true ORDER BY created_at DESC",
      [user.communityId]
    );

    return NextResponse.json({ success: true, rates: result.rows });
  } catch (err: any) {
    console.error("Fetch Rates Error", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// POST - Create or update a rate
export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, communityId, utilityType, name, isMetered, flatRate, rateTiers } = await req.json();

    if (!utilityType || !name) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
    }

    let result;
    if (id) {
      // Update
      result = await query(
        `UPDATE utility_rates 
         SET name = $1, is_metered = $2, flat_rate = $3, rate_tiers = $4, updated_at = NOW() 
         WHERE id = $5 AND community_id = $6 RETURNING *`,
        [name, isMetered, flatRate !== undefined ? flatRate : null, rateTiers ? JSON.stringify(rateTiers) : null, id, user.communityId]
      );
    } else {
      // Insert
      result = await query(
        `INSERT INTO utility_rates (community_id, utility_type, name, is_metered, flat_rate, rate_tiers) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [communityId || user.communityId, utilityType, name, isMetered, flatRate !== undefined ? flatRate : null, rateTiers ? JSON.stringify(rateTiers) : null]
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error("Save Rate Error", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// DELETE - Soft-delete a rate
export async function DELETE(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ระบุรหัสเรทไม่ถูกต้อง" }, { status: 400 });
    }

    await query(
      "UPDATE utility_rates SET is_active = false WHERE id = $1 AND community_id = $2",
      [id, user.communityId]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Delete Rate Error", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
