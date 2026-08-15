import { query } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { fullName, email, password, phone, communityName } = await req.json();

    if (!fullName || !email || !password || !phone || !communityName) {
      return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" }, { status: 400 });
    }

    // 1. Check if email already exists in staff
    const checkEmail = await query("SELECT id FROM staff WHERE email = $1", [email.toLowerCase()]);
    if (checkEmail.rowCount && checkEmail.rowCount > 0) {
      return NextResponse.json({ error: "อีเมลนี้ถูกใช้งานแล้ว" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    // 2. Perform Database Transaction
    // Create community first
    const communityResult = await query(
      "INSERT INTO communities (name) VALUES ($1) RETURNING id",
      [communityName]
    );
    const communityId = communityResult.rows[0].id;

    // Create staff member
    await query(
      `INSERT INTO staff (email, password_hash, community_id, full_name, role, phone) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [email.toLowerCase(), passwordHash, communityId, fullName, 'admin', phone]
    );

    return NextResponse.json({ success: true, message: "ลงทะเบียนกรรมการและชุมชนสำเร็จ" });
  } catch (err: any) {
    console.error("Register Error", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาดในการลงทะเบียน" }, { status: 500 });
  }
}
