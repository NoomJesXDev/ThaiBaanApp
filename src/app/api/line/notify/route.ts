import { query } from "@/lib/db";
import { sendBillFlexPush } from "@/lib/line/messaging";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { billId } = await req.json();

    if (!billId) {
      return NextResponse.json({ error: "Missing billId" }, { status: 400 });
    }

    // 1. Query the bill with period details
    const billResult = await query(
      `SELECT b.*, bp.period_month, bp.period_year, h.house_number, h.owner_name, h.id as house_id
       FROM bills b
       JOIN billing_periods bp ON b.billing_period_id = bp.id
       JOIN houses h ON b.house_id = h.id
       WHERE b.id = $1`,
      [billId]
    );

    const bill = billResult.rows[0];

    if (!bill) {
      return NextResponse.json({ error: "ไม่พบข้อมูลบิลดังกล่าว" }, { status: 404 });
    }

    // 2. Fetch linked LINE members for this house
    const membersResult = await query(
      "SELECT line_user_id FROM house_members WHERE house_id = $1",
      [bill.house_id]
    );
    const members = membersResult.rows;

    if (members.length === 0) {
      return NextResponse.json(
        { error: "บ้านเลขที่นี้ยังไม่มีสมาชิกผูกบัญชี LINE" },
        { status: 400 }
      );
    }

    // 3. Fetch bill items
    const itemsResult = await query(
      "SELECT utility_type, amount FROM bill_items WHERE bill_id = $1",
      [billId]
    );
    const billItems = itemsResult.rows;

    const waterItem = billItems.find((i: any) => i.utility_type === "water");
    const garbageItem = billItems.find((i: any) => i.utility_type === "garbage");
    const funeralItem = billItems.find((i: any) => i.utility_type === "funeral");

    const monthNames = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    const monthStr = `${monthNames[bill.period_month - 1]} ${bill.period_year + 543}`;

    // LIFF redirect URL
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    const liffUrl = `https://liff.line.me/${liffId}?billId=${bill.id}`;

    const notifyResults = await Promise.all(
      members.map(async (member: any) => {
        return await sendBillFlexPush(member.line_user_id, {
          monthStr,
          houseNumber: bill.house_number,
          ownerName: bill.owner_name || "ลูกบ้าน",
          waterAmount: waterItem ? Number(waterItem.amount) : 0,
          garbageAmount: garbageItem ? Number(garbageItem.amount) : 0,
          funeralAmount: funeralItem ? Number(funeralItem.amount) : 0,
          totalAmount: Number(bill.total_amount),
          payUrl: liffUrl,
        });
      })
    );

    // Check if at least one message succeeded
    const anySuccess = notifyResults.some((r) => r.success);
    if (!anySuccess) {
      return NextResponse.json(
        { error: "การส่งแจ้งเตือนผ่าน LINE ล้มเหลว", details: notifyResults },
        { status: 500 }
      );
    }

    // Update notified_at in DB
    await query(
      "UPDATE bills SET notified_at = NOW() WHERE id = $1",
      [billId]
    );

    return NextResponse.json({ success: true, results: notifyResults });
  } catch (err: any) {
    console.error("Notify Route Error", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
