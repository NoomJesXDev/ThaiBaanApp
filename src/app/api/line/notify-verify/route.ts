import { query } from "@/lib/db";
import { sendTextPush } from "@/lib/line/messaging";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { billId, status, note } = await req.json();

    if (!billId || !status) {
      return NextResponse.json(
        { error: "Missing billId or status" },
        { status: 400 }
      );
    }

    // 1. Query the bill with period and house details
    const billResult = await query(
      `SELECT b.total_amount, bp.period_month, bp.period_year, h.house_number, h.id as house_id
       FROM bills b
       JOIN billing_periods bp ON b.billing_period_id = bp.id
       JOIN houses h ON b.house_id = h.id
       WHERE b.id = $1`,
      [billId]
    );

    const bill = billResult.rows[0];

    if (!bill) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลบิลสำหรับแจ้งเตือน" },
        { status: 404 }
      );
    }

    // 2. Fetch linked LINE members for this house
    const membersResult = await query(
      "SELECT line_user_id FROM house_members WHERE house_id = $1",
      [bill.house_id]
    );
    const members = membersResult.rows;

    if (members.length === 0) {
      return NextResponse.json({ success: true, message: "No members to notify" });
    }

    const monthNames = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    const monthStr = `${monthNames[bill.period_month - 1]} ${bill.period_year + 543}`;

    let notifyText = "";
    if (status === "approved") {
      notifyText = `✅ ยอดโอนเงินจำนวน ${Number(bill.total_amount).toFixed(
        2
      )} บาท ประจำเดือน ${monthStr} สำหรับบ้านเลขที่ ${
        bill.house_number
      } ได้รับการยืนยันเรียบร้อยแล้วค่ะ ขอบคุณที่ชำระค่าสาธารณูปโภคชุมชนตรงเวลาค่ะ 🙏`;
    } else {
      notifyText = `⚠️ ยอดโอนเงินประจำเดือน ${monthStr} สำหรับบ้านเลขที่ ${
        bill.house_number
      } ถูกปฏิเสธการยืนยัน\n\nเหตุผล: ${note || "ข้อมูลสลิปไม่ถูกต้อง"}\n\nกรุณาแนบสลิปใหม่อีกครั้งที่ระบบค่ะ`;
    }

    // Send push message to all linked family members
    const notifyResults = await Promise.all(
      members.map(async (member: any) => {
        return await sendTextPush(member.line_user_id, notifyText);
      })
    );

    return NextResponse.json({ success: true, results: notifyResults });
  } catch (err: any) {
    console.error("Notify Verify Route Error", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
