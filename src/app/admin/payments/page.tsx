import { getServerUser } from "@/lib/auth-server";
import { query } from "@/lib/db";
import PaymentVerify from "@/features/payments/components/PaymentVerify";
import { redirect } from "next/navigation";

export default async function PaymentsPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  const staffId = user.id;
  const communityId = user.community_id;

  // Fetch pending payments where verified_at is null for this community
  const paymentsResult = await query(
    `SELECT 
       p.id as payment_id, p.bill_id, p.house_id, p.amount as paid_amount, p.slip_image_url, p.paid_at, p.note,
       h.house_number, h.owner_name,
       b.total_amount as bill_amount, b.status as bill_status,
       bp.period_month, bp.period_year
     FROM payments p
     JOIN houses h ON p.house_id = h.id
     JOIN bills b ON p.bill_id = b.id
     JOIN billing_periods bp ON b.billing_period_id = bp.id
     WHERE p.verified_at IS NULL AND h.community_id = $1
     ORDER BY p.created_at ASC`,
    [communityId]
  );

  const pendingPayments = paymentsResult.rows.map((row: Record<string, unknown>) => ({
    id: String(row.payment_id),
    bill_id: String(row.bill_id),
    house_id: String(row.house_id),
    amount: Number(row.paid_amount),
    slip_image_url: String(row.slip_image_url || ""),
    paid_at: String(row.paid_at || ""),
    note: row.note ? String(row.note) : null,
    houses: {
      house_number: String(row.house_number || ""),
      owner_name: String(row.owner_name || "")
    },
    bills: {
      id: String(row.bill_id),
      total_amount: Number(row.bill_amount),
      status: String(row.bill_status || ""),
      billing_periods: {
        period_month: Number(row.period_month),
        period_year: Number(row.period_year)
      }
    }
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 font-display">ตรวจสอบยอดโอนเงิน</h1>
        <p className="text-sm text-slate-500">
          ตรวจสอบความถูกต้องของสลิปหลักฐานการชำระเงินที่ลูกบ้านแนบส่งเข้ามา
        </p>
      </div>
      <PaymentVerify
        initialPayments={pendingPayments}
        staffId={staffId}
      />
    </div>
  );
}
