import { query } from "@/lib/db";
import { comparePassword, signJWT } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "กรุณากรอกอีเมลและรหัสผ่าน" }, { status: 400 });
    }

    // 1. Fetch staff member
    const result = await query(
      "SELECT id, email, password_hash, community_id, role, full_name FROM staff WHERE email = $1 AND is_active = true",
      [email.toLowerCase()]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }

    const staff = result.rows[0];

    // 2. Verify password
    const valid = await comparePassword(password, staff.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }

    // 3. Sign JWT Session Token
    const payload = {
      userId: staff.id,
      email: staff.email,
      communityId: staff.community_id,
      role: staff.role,
      fullName: staff.full_name
    };

    const token = await signJWT(payload);

    // 4. Set Session Cookie
    const response = NextResponse.json({ success: true, user: payload });
    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/"
    });

    return response;
  } catch (err: any) {
    console.error("Login Error", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" }, { status: 500 });
  }
}
