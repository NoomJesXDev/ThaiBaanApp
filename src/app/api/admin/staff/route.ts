import { query } from "@/lib/db";
import { hashPassword, verifyJWT } from "@/lib/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function getAuthUser(req: Request) {
  // Try cookie header from req
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/session=([^;]+)/);
  let token = match ? match[1] : null;

  if (!token) {
    const cookieStore = await cookies();
    token = cookieStore.get("session")?.value || null;
  }

  if (!token) return null;
  return verifyJWT(token);
}

// GET /api/admin/staff - Fetch all staff in current community
export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await query(
      `SELECT id, email, full_name, role, phone, is_active, created_at 
       FROM staff 
       WHERE community_id = $1 
       ORDER BY created_at ASC`,
      [user.communityId]
    );

    return NextResponse.json({
      success: true,
      staff: result.rows,
      currentUserId: user.userId,
    });
  } catch (err: any) {
    console.error("Fetch Staff Error", err);
    return NextResponse.json(
      { error: err.message || "เกิดข้อผิดพลาดในการดึงข้อมูลกรรมการ" },
      { status: 500 }
    );
  }
}

// POST /api/admin/staff - Add new staff member to current community
export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fullName, email, phone, password, role } = await req.json();

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: "กรุณากรอกชื่อ-นามสกุล, อีเมล และรหัสผ่าน" },
        { status: 400 }
      );
    }

    if (password.trim().length < 6) {
      return NextResponse.json(
        { error: "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร" },
        { status: 400 }
      );
    }

    // Check if email is already taken
    const checkEmail = await query(
      "SELECT id FROM staff WHERE email = $1",
      [email.trim().toLowerCase()]
    );

    if (checkEmail.rowCount && checkEmail.rowCount > 0) {
      return NextResponse.json(
        { error: "อีเมลนี้มีอยู่ในระบบแล้ว กรุณาใช้อีเมลอื่น" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password.trim());
    const staffRole = role === "community_admin" || role === "admin" ? "community_admin" : "committee";

    await query(
      `INSERT INTO staff (email, password_hash, community_id, full_name, role, phone, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [
        email.trim().toLowerCase(),
        passwordHash,
        user.communityId,
        fullName.trim(),
        staffRole,
        phone ? phone.trim() : null,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "เพิ่มกรรมการใหม่เข้าสู่ระบบเรียบร้อยแล้ว",
    });
  } catch (err: any) {
    console.error("Create Staff Error", err);
    return NextResponse.json(
      { error: err.message || "เกิดข้อผิดพลาดในการเพิ่มกรรมการ" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/staff - Reset staff password or update info
export async function PUT(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { staffId, fullName, phone, newPassword } = await req.json();

    if (!staffId) {
      return NextResponse.json(
        { error: "กรุณาระบุรหัสกรรมการ (Staff ID)" },
        { status: 400 }
      );
    }

    // Ensure staff belongs to the same community
    const checkStaff = await query(
      "SELECT id FROM staff WHERE id = $1 AND community_id = $2",
      [staffId, user.communityId]
    );

    if (checkStaff.rowCount === 0) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลกรรมการในชุมชนนี้" },
        { status: 404 }
      );
    }

    // Build update dynamic query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (fullName && fullName.trim()) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(fullName.trim());
    }

    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(phone ? phone.trim() : null);
    }

    if (newPassword && newPassword.trim()) {
      if (newPassword.trim().length < 6) {
        return NextResponse.json(
          { error: "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร" },
          { status: 400 }
        );
      }
      const hash = await hashPassword(newPassword.trim());
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(hash);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "ไม่มีข้อมูลที่ต้องอัปเดต" },
        { status: 400 }
      );
    }

    updates.push("updated_at = NOW()");
    values.push(staffId);
    values.push(user.communityId);

    await query(
      `UPDATE staff 
       SET ${updates.join(", ")} 
       WHERE id = $${paramIndex++} AND community_id = $${paramIndex++}`,
      values
    );

    return NextResponse.json({
      success: true,
      message: "อัปเดตข้อมูลและรหัสผ่านกรรมการเรียบร้อยแล้ว",
    });
  } catch (err: any) {
    console.error("Update Staff Error", err);
    return NextResponse.json(
      { error: err.message || "เกิดข้อผิดพลาดในการอัปเดตข้อมูลกรรมการ" },
      { status: 500 }
    );
  }
}
