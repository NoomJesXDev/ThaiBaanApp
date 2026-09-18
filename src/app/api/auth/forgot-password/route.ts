import { query } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, phone, newPassword } = await req.json();

    if (!email || !phone || !newPassword) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร" },
        { status: 400 }
      );
    }

    // 1. Find staff by email
    const result = await query(
      "SELECT id, email, phone FROM staff WHERE email = $1 AND is_active = true",
      [email.trim().toLowerCase()]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลกรรมการที่ใช้อีเมลนี้ หรือบัญชีถูกระงับ" },
        { status: 404 }
      );
    }

    const staff = result.rows[0];

    // Normalize phone numbers for comparison (remove spaces, dashes, etc.)
    const inputCleanPhone = phone.replace(/\D/g, "");
    const dbCleanPhone = staff.phone ? staff.phone.replace(/\D/g, "") : "";

    // If staff has a registered phone, it must match
    if (dbCleanPhone && dbCleanPhone !== inputCleanPhone) {
      return NextResponse.json(
        { error: "เบอร์โทรศัพท์ไม่ตรงกับข้อมูลในระบบ กรุณาตรวจสอบอีกครั้ง" },
        { status: 400 }
      );
    }

    // 2. Hash new password and update
    const passwordHash = await hashPassword(newPassword);

    await query(
      `UPDATE staff 
       SET password_hash = $1, 
           phone = COALESCE(NULLIF($2, ''), phone),
           updated_at = NOW() 
       WHERE id = $3`,
      [passwordHash, phone.trim(), staff.id]
    );

    return NextResponse.json({
      success: true,
      message: "ตั้งรหัสผ่านใหม่สำเร็จแล้ว สามารถเข้าสู่ระบบได้ทันที",
    });
  } catch (err: any) {
    console.error("Forgot Password Error", err);
    return NextResponse.json(
      { error: err.message || "เกิดข้อผิดพลาดในการตั้งรหัสผ่านใหม่" },
      { status: 500 }
    );
  }
}
