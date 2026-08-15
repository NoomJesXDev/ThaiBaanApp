import { getServerUser } from "@/lib/auth-server";
import { query } from "@/lib/db";
import HouseManagement from "@/features/houses/components/HouseManagement";
import { redirect } from "next/navigation";

export default async function HousesPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  const communityId = user.community_id;

  // 1. Fetch houses in this community
  const housesResult = await query(
    "SELECT id, house_number, owner_name, water_meter_id FROM houses WHERE community_id = $1 AND is_active = true ORDER BY house_number ASC",
    [communityId]
  );
  const houses = housesResult.rows;

  if (houses.length > 0) {
    const houseIds = houses.map((h) => h.id);
    // 2. Fetch linked LINE members for these houses
    const membersResult = await query(
      "SELECT id, house_id, line_user_id, display_name, picture_url FROM house_members WHERE house_id = ANY($1)",
      [houseIds]
    );
    const members = membersResult.rows;

    // 3. Map members to their respective houses
    houses.forEach((house) => {
      house.house_members = members.filter((m) => m.house_id === house.id);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 font-display">จัดการบ้านเลขที่</h1>
          <p className="text-sm text-slate-500">จัดการข้อมูลบ้านและสถานะการเชื่อมต่อ LINE</p>
        </div>
      </div>
      <HouseManagement initialHouses={houses} communityId={communityId} />
    </div>
  );
}
