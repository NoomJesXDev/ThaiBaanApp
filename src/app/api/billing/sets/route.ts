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

// GET /api/billing/sets
export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const communityId = user.communityId;

    const result = await query(
      "SELECT * FROM billing_sets WHERE community_id = $1 AND is_active = true ORDER BY created_at DESC",
      [communityId]
    );

    return NextResponse.json({ success: true, sets: result.rows });
  } catch (err: any) {
    console.error("Fetch Billing Sets Error", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// POST /api/billing/sets
export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, name, items } = await req.json();

    if (!name || !Array.isArray(items)) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
    }

    const communityId = user.communityId;

    if (id) {
      // Update
      const result = await query(
        `UPDATE billing_sets 
         SET name = $1, items = $2 
         WHERE id = $3 AND community_id = $4 
         RETURNING *`,
        [name, JSON.stringify(items), id, communityId]
      );
      return NextResponse.json({ success: true, data: result.rows[0] });
    } else {
      // Insert
      const result = await query(
        `INSERT INTO billing_sets (community_id, name, items) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [communityId, name, JSON.stringify(items)]
      );
      return NextResponse.json({ success: true, data: result.rows[0] });
    }
  } catch (err: any) {
    console.error("Save Billing Set Error", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// DELETE /api/billing/sets?id=X
export async function DELETE(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ระบุรหัสชุดเก็บเงินไม่ถูกต้อง" }, { status: 400 });
    }

    const communityId = user.communityId;

    await query(
      "UPDATE billing_sets SET is_active = false WHERE id = $1 AND community_id = $2",
      [id, communityId]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Delete Billing Set Error", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
