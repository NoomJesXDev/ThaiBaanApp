import { query } from "@/lib/db";
import { hashPassword, signPasswordResetToken } from "@/lib/auth";
import { isEmailConfigured, sendPasswordChangedEmail, sendPasswordResetEmail } from "@/lib/email";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mode = "email", email, phone, newPassword } = body;

    if (!email || !String(email).trim()) {
      return NextResponse.json(
        { error: "กรุณากรอกอีเมลที่ลงทะเบียนไว้" },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // 1. Find active staff by email
    const result = await query(
      "SELECT id, email, full_name, phone, password_hash FROM staff WHERE email = $1 AND is_active = true",
      [normalizedEmail]
    );

    // Mode A: Email Reset Link (Recommended & Default)
    if (mode === "email") {
      if (!isEmailConfigured()) {
        return NextResponse.json(
          {
            error:
              "ระบบยังไม่ได้ตั้งค่า Gmail SMTP (SMTP_USER / SMTP_PASS) กรุณาตั้งค่าหรือใช้วิธียืนยันด้วยเบอร์โทรศัพท์",
          },
          { status: 503 }
        );
      }

      if (result.rowCount && result.rowCount > 0) {
        const staff = result.rows[0];
        const pwHash = String(staff.password_hash || "");
        const token = await signPasswordResetToken({
          staffId: String(staff.id),
          email: String(staff.email),
          pwFingerprint: pwHash.slice(0, 20),
        });

        const origin =
          process.env.NEXT_PUBLIC_APP_URL ||
          req.headers.get("origin") ||
          "http://localhost:3000";
        const resetUrl = `${origin.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;

        const sendRes = await sendPasswordResetEmail(
          String(staff.email),
          String(staff.full_name || "กรรมการ"),
          resetUrl
        );

        if (!sendRes.success) {
          return NextResponse.json(
            {
              error:
                "ไม่สามารถส่งอีเมลได้ในขณะนี้ กรุณาตรวจสอบการตั้งค่า Gmail SMTP (" +
                (sendRes.error || "Unknown error") +
                ")",
            },
            { status: 500 }
          );
        }
      }

      // Always return generic success message so attackers cannot enumerate registered emails
      return NextResponse.json({
        success: true,
        message:
          "หากอีเมลนี้ลงทะเบียนอยู่ในระบบ เราได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปที่อีเมลของคุณแล้ว (ลิงก์มีอายุ 15 นาที)",
      });
    }

    // Mode B: Phone verification fallback
    if (!phone || !newPassword) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง" },
        { status: 400 }
      );
    }

    if (String(newPassword).length < 6) {
      return NextResponse.json(
        { error: "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร" },
        { status: 400 }
      );
    }

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลกรรมการที่ใช้อีเมลนี้ หรือบัญชีถูกระงับ" },
        { status: 404 }
      );
    }

    const staff = result.rows[0];
    const inputCleanPhone = String(phone).replace(/\D/g, "");
    const dbCleanPhone = staff.phone ? String(staff.phone).replace(/\D/g, "") : "";

    if (!dbCleanPhone) {
      return NextResponse.json(
        {
          error:
            "บัญชีนี้ยังไม่ได้ลงทะเบียนเบอร์โทรศัพท์ กรุณาใช้วิธีรับลิงก์รีเซ็ตทางอีเมลแทน",
        },
        { status: 400 }
      );
    }

    if (dbCleanPhone !== inputCleanPhone) {
      return NextResponse.json(
        { error: "เบอร์โทรศัพท์ไม่ตรงกับข้อมูลในระบบ กรุณาตรวจสอบอีกครั้ง" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(String(newPassword));
    await query(
      `UPDATE staff 
       SET password_hash = $1, 
           updated_at = NOW() 
       WHERE id = $2`,
      [passwordHash, staff.id]
    );

    // Send confirmation email if SMTP is configured (non-blocking)
    if (isEmailConfigured()) {
      void sendPasswordChangedEmail(String(staff.email), String(staff.full_name || "กรรมการ"));
    }

    return NextResponse.json({
      success: true,
      message: "ตั้งรหัสผ่านใหม่สำเร็จแล้ว สามารถเข้าสู่ระบบได้ทันที",
    });
  } catch (err: unknown) {
    console.error("Forgot Password Error", err);
    const message =
      err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการตั้งรหัสผ่านใหม่";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
