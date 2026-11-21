import { query } from "@/lib/db";
import { hashPassword, verifyPasswordResetToken } from "@/lib/auth";
import { isEmailConfigured, sendPasswordChangedEmail } from "@/lib/email";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบถ้วน กรุณาเปิดลิงก์จากอีเมลใหม่อีกครั้ง" },
        { status: 400 }
      );
    }

    if (String(newPassword).length < 6) {
      return NextResponse.json(
        { error: "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร" },
        { status: 400 }
      );
    }

    const payload = await verifyPasswordResetToken(String(token));
    if (!payload) {
      return NextResponse.json(
        { error: "ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว (เกิน 15 นาที) กรุณาขอลิงก์ใหม่" },
        { status: 400 }
      );
    }

    const result = await query(
      "SELECT id, email, full_name, password_hash FROM staff WHERE id = $1 AND email = $2 AND is_active = true",
      [payload.staffId, payload.email]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "ไม่พบบัญชีผู้ใช้หรือบัญชีถูกระงับ" },
        { status: 404 }
      );
    }

    const staff = result.rows[0];
    const currentFingerprint = String(staff.password_hash || "").slice(0, 20);

    // Ensure one-time use: once password is updated, old link becomes invalid
    if (currentFingerprint !== payload.pwFingerprint) {
      return NextResponse.json(
        { error: "ลิงก์นี้ถูกใช้งานไปแล้ว กรุณาขอลิงก์ใหม่หากต้องการเปลี่ยนรหัสผ่านอีกครั้ง" },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(String(newPassword));
    await query(
      `UPDATE staff
       SET password_hash = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [newHash, staff.id]
    );

    if (isEmailConfigured()) {
      void sendPasswordChangedEmail(String(staff.email), String(staff.full_name || "กรรมการ"));
    }

    return NextResponse.json({
      success: true,
      message: "ตั้งรหัสผ่านใหม่สำเร็จแล้ว สามารถเข้าสู่ระบบได้ทันที",
    });
  } catch (err: unknown) {
    console.error("Reset Password Error", err);
    const message =
      err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการตั้งรหัสผ่านใหม่";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
