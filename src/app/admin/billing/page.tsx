import { getServerUser } from "@/lib/auth-server";
import { query } from "@/lib/db";
import BillingManagement from "@/features/billing/components/BillingManagement";
import { redirect } from "next/navigation";

export default async function BillingPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  const communityId = user.community_id;
  const staffId = user.id;

  // 1. Fetch houses in the community
  const housesResult = await query(
    "SELECT id, house_number, owner_name, water_meter_id FROM houses WHERE community_id = $1 AND is_active = true ORDER BY house_number ASC",
    [communityId]
  );
  const houses = housesResult.rows;

  // 2. Fetch active utility rates
  const ratesResult = await query(
    "SELECT id, utility_type, name, is_metered, flat_rate, rate_tiers FROM utility_rates WHERE community_id = $1 AND is_active = true",
    [communityId]
  );
  const rates = ratesResult.rows;

  // 3. Get the last current_reading for each house to serve as default previous_reading
  const latestPeriodResult = await query(
    "SELECT id FROM billing_periods WHERE community_id = $1 ORDER BY period_year DESC, period_month DESC LIMIT 1",
    [communityId]
  );
  const latestBillingPeriod = latestPeriodResult.rows;

  let previousReadings: Record<string, number> = {};
  if (latestBillingPeriod.length > 0) {
    const previousBillsResult = await query(
      `SELECT b.house_id, bi.current_reading 
       FROM bills b
       JOIN bill_items bi ON b.id = bi.bill_id
       WHERE b.billing_period_id = $1 AND bi.utility_type = 'water' AND bi.current_reading IS NOT NULL`,
      [latestBillingPeriod[0].id]
    );
    
    previousBillsResult.rows.forEach((row: any) => {
      previousReadings[row.house_id] = Number(row.current_reading);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 font-display">สร้างชุดบิลเรียกเก็บ</h1>
        <p className="text-sm text-slate-500">
          คำนวณค่าสาธารณูปโภค จดเลขมิเตอร์ และสร้างยอดเรียกเก็บเงินส่งแจ้งเตือนให้กับแต่ละหลังคาเรือน
        </p>
      </div>
      <BillingManagement
        houses={houses}
        rates={rates}
        previousReadings={previousReadings}
        communityId={communityId}
        staffId={staffId}
      />
    </div>
  );
}
