import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter(): Transporter {
  if (!transporter) {
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.SMTP_PORT || "465", 10);
    const secure = process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === "true"
      : port === 465;

    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

function getFromAddress(): string {
  const user = process.env.SMTP_USER || "no-reply@communex.app";
  return process.env.SMTP_FROM || `CommuneX <${user}>`;
}

export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    console.warn("⚠️ SMTP_USER / SMTP_PASS is not configured. Skipping email send.");
    return {
      success: false,
      error: "ระบบยังไม่ได้ตั้งค่าอีเมล (SMTP_USER / SMTP_PASS)",
    };
  }

  try {
    const mailer = getTransporter();
    await mailer.sendMail({
      from: getFromAddress(),
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    console.error("Email Send Error:", message);
    return { success: false, error: message };
  }
}

export async function sendPasswordResetEmail(
  to: string,
  fullName: string,
  resetUrl: string
) {
  const displayName = fullName || "กรรมการ";
  const html = `
    <div style="font-family: 'Prompt', 'Noto Sans Thai', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: #1e3a8a; padding: 24px 28px; color: #ffffff;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 700;">CommuneX</h1>
        <p style="margin: 6px 0 0; font-size: 13px; color: #bfdbfe;">คำขอตั้งรหัสผ่านใหม่ (Password Reset)</p>
      </div>
      <div style="padding: 28px; color: #1e293b; font-size: 14px; line-height: 1.7;">
        <p style="margin-top: 0;">สวัสดีคุณ <strong>${displayName}</strong>,</p>
        <p>เราได้รับคำขอตั้งรหัสผ่านใหม่สำหรับบัญชีกรรมการของคุณ กรุณากดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่:</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; padding: 12px 28px; border-radius: 10px; font-size: 14px;">
            ตั้งรหัสผ่านใหม่
          </a>
        </div>
        <p style="font-size: 12px; color: #64748b;">
          ลิงก์นี้มีอายุใช้งาน <strong>15 นาที</strong> และสามารถใช้งานได้เพียงครั้งเดียวเท่านั้น<br/>
          หากคุณไม่ได้เป็นผู้ร้องขอ กรุณาเพิกเฉยต่ออีเมลฉบับนี้ รหัสผ่านของคุณจะไม่มีการเปลี่ยนแปลง
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8; word-break: break-all;">
          หากกดปุ่มไม่ได้ สามารถคัดลอกลิงก์นี้ไปเปิดในเบราว์เซอร์:<br/>
          ${resetUrl}
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject: "[CommuneX] ลิงก์สำหรับตั้งรหัสผ่านใหม่",
    html,
    text: `สวัสดีคุณ ${displayName}\n\nกรุณาเปิดลิงก์นี้ภายใน 15 นาทีเพื่อตั้งรหัสผ่านใหม่:\n${resetUrl}\n\nหากคุณไม่ได้เป็นผู้ร้องขอ สามารถเพิกเฉยอีเมลนี้ได้`,
  });
}

export async function sendPasswordChangedEmail(to: string, fullName: string) {
  const displayName = fullName || "กรรมการ";
  const html = `
    <div style="font-family: 'Prompt', 'Noto Sans Thai', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: #059669; padding: 24px 28px; color: #ffffff;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 700;">CommuneX</h1>
        <p style="margin: 6px 0 0; font-size: 13px; color: #d1fae5;">แจ้งเตือนความปลอดภัยบัญชี</p>
      </div>
      <div style="padding: 28px; color: #1e293b; font-size: 14px; line-height: 1.7;">
        <p style="margin-top: 0;">สวัสดีคุณ <strong>${displayName}</strong>,</p>
        <p>รหัสผ่านสำหรับบัญชีกรรมการของคุณถูกเปลี่ยนเรียบร้อยแล้วเมื่อสักครู่</p>
        <p style="font-size: 12px; color: #64748b;">
          หากคุณไม่ได้เป็นผู้ดำเนินการ กรุณาติดต่อผู้ดูแลระบบชุมชนทันที
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject: "[CommuneX] แจ้งเตือนการเปลี่ยนรหัสผ่านสำเร็จ",
    html,
    text: `สวัสดีคุณ ${displayName}\n\nรหัสผ่านสำหรับบัญชีกรรมการของคุณถูกเปลี่ยนเรียบร้อยแล้ว หากคุณไม่ได้เป็นผู้ดำเนินการ กรุณาติดต่อผู้ดูแลระบบทันที`,
  });
}

export async function sendNewPaymentSlipEmail(
  to: string[],
  data: {
    communityName: string;
    houseNumber: string;
    ownerName: string;
    amount: number;
    verifyUrl: string;
  }
) {
  if (!to.length) return { success: false, error: "No recipients" };

  const html = `
    <div style="font-family: 'Prompt', 'Noto Sans Thai', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: #1e3a8a; padding: 24px 28px; color: #ffffff;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 700;">CommuneX — ${data.communityName}</h1>
        <p style="margin: 6px 0 0; font-size: 13px; color: #bfdbfe;">มีสลิปแจ้งชำระเงินใหม่รอตรวจสอบ</p>
      </div>
      <div style="padding: 28px; color: #1e293b; font-size: 14px; line-height: 1.7;">
        <p style="margin-top: 0;">ลูกบ้านได้ส่งหลักฐานการโอนเงินเข้ามาใหม่ในระบบ:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #f8fafc; border-radius: 8px;">
          <tr>
            <td style="padding: 10px 14px; color: #64748b;">บ้านเลขที่</td>
            <td style="padding: 10px 14px; font-weight: 700; text-align: right;">${data.houseNumber}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; color: #64748b;">ชื่อเจ้าของบ้าน</td>
            <td style="padding: 10px 14px; font-weight: 600; text-align: right;">${data.ownerName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; color: #64748b;">ยอดเงินที่แจ้งโอน</td>
            <td style="padding: 10px 14px; font-weight: 700; color: #059669; text-align: right;">${Number(data.amount).toFixed(2)} บาท</td>
          </tr>
        </table>
        <div style="text-align: center; margin: 24px 0 8px;">
          <a href="${data.verifyUrl}" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; font-weight: 600; padding: 12px 28px; border-radius: 10px; font-size: 14px;">
            เปิดหน้าตรวจสอบสลิป
          </a>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject: `[CommuneX] แจ้งสลิปโอนเงินใหม่ บ้านเลขที่ ${data.houseNumber} (${Number(data.amount).toFixed(2)} บาท)`,
    html,
    text: `มีสลิปแจ้งโอนเงินใหม่\nบ้านเลขที่: ${data.houseNumber}\nชื่อ: ${data.ownerName}\nยอดเงิน: ${Number(data.amount).toFixed(2)} บาท\nตรวจสอบได้ที่: ${data.verifyUrl}`,
  });
}
