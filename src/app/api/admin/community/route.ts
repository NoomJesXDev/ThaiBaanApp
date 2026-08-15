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

// GET /api/admin/community - Fetch community details including LINE configuration
export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const communityId = user.communityId;

    // Ensure line_liff_id column exists
    await query("ALTER TABLE communities ADD COLUMN IF NOT EXISTS line_liff_id TEXT;");

    const result = await query(
      `SELECT id, name, address, line_channel_id, line_channel_secret, line_channel_access_token, line_liff_id, created_at 
       FROM communities WHERE id = $1`,
      [communityId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "ไม่พบข้อมูลชุมชน" }, { status: 404 });
    }

    return NextResponse.json({ success: true, community: result.rows[0] });
  } catch (err: any) {
    console.error("Fetch Community Error", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// PUT /api/admin/community - Update community name and LINE configuration
export async function PUT(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const communityId = user.communityId;
    const { name, address, lineChannelId, lineLiffId, lineChannelSecret, lineChannelAccessToken } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "กรุณาระบุชื่อหมู่บ้าน/ชุมชน" }, { status: 400 });
    }

    // Ensure line_liff_id column exists
    await query("ALTER TABLE communities ADD COLUMN IF NOT EXISTS line_liff_id TEXT;");

    await query(
      `UPDATE communities 
       SET name = $1, 
           address = $2, 
           line_channel_id = $3, 
           line_liff_id = $4,
           line_channel_secret = $5,
           line_channel_access_token = $6,
           updated_at = NOW() 
       WHERE id = $7`,
      [
        name.trim(),
        address?.trim() || null,
        lineChannelId?.trim() || null,
        lineLiffId?.trim() || null,
        lineChannelSecret?.trim() || null,
        lineChannelAccessToken?.trim() || null,
        communityId
      ]
    );

    return NextResponse.json({ success: true, message: "บันทึกข้อมูลชุมชนและการตั้งค่า LINE เรียบร้อยแล้ว" });
  } catch (err: any) {
    console.error("Update Community Error", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
