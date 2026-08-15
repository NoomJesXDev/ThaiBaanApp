import { getServerUser } from "@/lib/auth-server";
import { query } from "@/lib/db";
import RatesManagement from "@/features/billing/components/RatesManagement";
import { redirect } from "next/navigation";

export default async function RatesPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  const communityId = user.community_id;

  // Fetch active utility rates for this community
  const ratesResult = await query(
    "SELECT id, community_id, utility_type, name, is_metered, flat_rate, rate_tiers FROM utility_rates WHERE community_id = $1 AND is_active = true",
    [communityId]
  );
  const rates = ratesResult.rows;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 font-display">สร้างรายการเก็บเงิน</h1>
        <p className="text-sm text-slate-500">
          สร้างและจัดการรายการเรียกเก็บเงินค่าสาธารณูปโภคประจำชุมชน (เช่น ค่าน้ำประปา, ค่าเก็บขยะ, เงินสงเคราะห์ หรือรายการพิเศษ)
        </p>
      </div>
      <RatesManagement initialRates={rates} communityId={communityId} />
    </div>
  );
}
