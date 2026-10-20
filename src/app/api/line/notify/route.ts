import { query } from "@/lib/db";
import { sendBillFlexPush } from "@/lib/line/messaging";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { billId } = await req.json();

    if (!billId) {
      return NextResponse.json({ error: "Missing billId" }, { status: 400 });
    }

    // 1. Query the bill with period, house, and community LINE credentials
    const billResult = await query(
      `SELECT b.*, bp.period_month, bp.period_year, 
              h.house_number, h.owner_name, h.id as house_id, h.community_id,
              c.name as community_name, c.line_channel_access_token, c.line_liff_id
       FROM bills b
       JOIN billing_periods bp ON b.billing_period_id = bp.id
       JOIN houses h ON b.house_id = h.id
       JOIN communities c ON h.community_id = c.id
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

    // 3. Fetch bill items with readable names
    const itemsResult = await query(
      `SELECT bi.utility_type, bi.amount,
              COALESCE(ur.name, CASE 
                WHEN bi.utility_type = 'water' THEN 'ค่าน้ำประปา'
                WHEN bi.utility_type = 'garbage' THEN 'ค่าเก็บขยะ'
                WHEN bi.utility_type = 'funeral' THEN 'เงินสงเคราะห์ฌาปนกิจ'
                ELSE bi.utility_type
              END) as name
       FROM bill_items bi
       LEFT JOIN utility_rates ur ON bi.utility_type = ur.utility_type AND ur.community_id = $2
       WHERE bi.bill_id = $1`,
      [billId, bill.community_id]
    );
    const billItems = itemsResult.rows;

    const monthNames = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    const monthStr = `${monthNames[bill.period_month - 1]} ${bill.period_year + 543}`;

    // LIFF redirect URL (prefer community's configured LIFF ID, fallback to env/app URL)
    const liffId = bill.line_liff_id || process.env.NEXT_PUBLIC_LIFF_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const liffUrl = liffId
      ? `https://liff.line.me/${liffId}?billId=${bill.id}`
      : `${appUrl}/liff/bills?billId=${bill.id}`;

    const formattedItems = billItems.map((i: any) => ({
      name: i.name,
      amount: Number(i.amount),
    }));

    const notifyResults = await Promise.all(
      members.map(async (member: any) => {
        return await sendBillFlexPush(
          member.line_user_id,
          {
            monthStr,
            houseNumber: bill.house_number,
            ownerName: bill.owner_name || "ลูกบ้าน",
            communityName: bill.community_name,
            items: formattedItems,
            arrearsAmount: Number(bill.arrears_amount || 0),
            totalAmount: Number(bill.total_amount),
            payUrl: liffUrl,
          },
          bill.line_channel_access_token || undefined
        );
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
