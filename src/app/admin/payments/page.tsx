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

  // Fetch pending payments where verified_at is null
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
     WHERE p.verified_at IS NULL
     ORDER BY p.created_at ASC`
  );

  const pendingPayments = paymentsResult.rows.map((row: any) => ({
    id: row.payment_id,
    bill_id: row.bill_id,
    house_id: row.house_id,
    amount: Number(row.paid_amount),
    slip_image_url: row.slip_image_url,
    paid_at: row.paid_at,
    note: row.note,
    houses: {
      house_number: row.house_number,
      owner_name: row.owner_name
    },
    bills: {
      id: row.bill_id,
      total_amount: Number(row.bill_amount),
      status: row.bill_status,
      billing_periods: {
        period_month: row.period_month,
        period_year: row.period_year
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
