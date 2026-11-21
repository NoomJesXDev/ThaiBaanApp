import { query } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import { NextResponse } from "next/server";

async function getAuthUser(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/session=([^;]+)/);
  const token = match ? match[1] : null;
  if (!token) return null;
  return verifyJWT(token);
}

interface ImportHouseInput {
  houseNumber: string;
  ownerName?: string | null;
  waterMeterId?: string | null;
}

// POST /api/houses/import
export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const rawHouses: ImportHouseInput[] = Array.isArray(body.houses) ? body.houses : [];
    const duplicateMode: "skip" | "update" =
      body.duplicateMode === "update" ? "update" : "skip";

    if (rawHouses.length === 0) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลบ้านสำหรับนำเข้า" },
        { status: 400 }
      );
    }

    if (rawHouses.length > 2000) {
      return NextResponse.json(
        { error: "รองรับการนำเข้าสูงสุด 2,000 หลังต่อครั้ง" },
        { status: 400 }
      );
    }

    const communityId = user.communityId;

    // Fetch existing houses for this community
    const existingRes = await query(
      "SELECT id, house_number FROM houses WHERE community_id = $1",
      [communityId]
    );
    const existingMap = new Map<string, string>();
    existingRes.rows.forEach((row: Record<string, unknown>) => {
      existingMap.set(String(row.house_number).trim().toLowerCase(), String(row.id));
    });

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const seenInBatch = new Set<string>();
    const insertedRows: Array<Record<string, unknown>> = [];
    const updatedRows: Array<Record<string, unknown>> = [];

    for (const item of rawHouses) {
      const houseNumber = String(item.houseNumber || "").trim();
      if (!houseNumber) {
        skipped++;
        continue;
      }

      const key = houseNumber.toLowerCase();
      if (seenInBatch.has(key)) {
        skipped++;
        continue;
      }
      seenInBatch.add(key);

      const ownerName = item.ownerName ? String(item.ownerName).trim() : null;
      const waterMeterId = item.waterMeterId ? String(item.waterMeterId).trim() : null;

      const existingId = existingMap.get(key);
      if (existingId) {
        if (duplicateMode === "update") {
          const updRes = await query(
            `UPDATE houses
             SET owner_name = COALESCE($1, owner_name),
                 water_meter_id = COALESCE($2, water_meter_id),
                 updated_at = NOW()
             WHERE id = $3 AND community_id = $4
             RETURNING *`,
            [ownerName, waterMeterId, existingId, communityId]
          );
          if (updRes.rows[0]) {
            updatedRows.push(updRes.rows[0]);
          }
          updated++;
        } else {
          skipped++;
        }
      } else {
        const insRes = await query(
          `INSERT INTO houses (community_id, house_number, owner_name, water_meter_id)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [communityId, houseNumber, ownerName, waterMeterId]
        );
        if (insRes.rows[0]) {
          insertedRows.push(insRes.rows[0]);
          existingMap.set(key, String(insRes.rows[0].id));
        }
        inserted++;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        inserted,
        updated,
        skipped,
        total: rawHouses.length,
      },
      insertedRows,
      updatedRows,
    });
  } catch (err: unknown) {
    console.error("Import Houses Error", err);
    return NextResponse.json(
      { error: (err instanceof Error ? err.message : undefined) || "เกิดข้อผิดพลาดในการนำเข้าข้อมูล" },
      { status: 500 }
    );
  }
}
