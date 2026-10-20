import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import type { QueryResult, QueryResultRow } from "pg";

const LOCAL_DEMO_DB_PATH = path.join(process.cwd(), ".demo-db.json");
const TMP_DEMO_DB_PATH = path.join(os.tmpdir(), "communex-demo-db.json");

interface DemoDB {
  communities: any[];
  staff: any[];
  houses: any[];
  house_members: any[];
  utility_rates: any[];
  billing_sets: any[];
  billing_periods: any[];
  bills: any[];
  bill_items: any[];
  payments: any[];
}

const DEFAULT_COMMUNITY_ID = "d451d753-4303-4e30-81ef-88e2e5270e0a";
// bcrypt hash for "password"
const DEFAULT_PASSWORD_HASH =
  "$2b$10$m4H6kfuCa34w6H0zO91JoOnqsd5Iw6E/FCUme5pMFo9o6XnX4WAyy";

function createInitialSeed(): DemoDB {
  const now = new Date().toISOString();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const waterRate = {
    id: "e54919e7-a11e-4142-9233-ddfde43d3e51",
    community_id: DEFAULT_COMMUNITY_ID,
    utility_type: "water",
    name: "ค่าน้ำประปา",
    is_metered: true,
    flat_rate: null,
    rate_tiers: [{ min: 0, max: 99999, rate: 5 }],
    is_active: true,
    created_at: now,
    updated_at: now,
  };
  const garbageRate = {
    id: "79218884-0915-4c72-95cc-e9e462da33ca",
    community_id: DEFAULT_COMMUNITY_ID,
    utility_type: "garbage",
    name: "ค่าเก็บขยะ",
    is_metered: false,
    flat_rate: 40.0,
    rate_tiers: null,
    is_active: true,
    created_at: now,
    updated_at: now,
  };
  const funeralRate = {
    id: "1a76d700-360e-4280-8384-958ab90d8ee8",
    community_id: DEFAULT_COMMUNITY_ID,
    utility_type: "funeral",
    name: "เงินสงเคราะห์ฌาปนกิจ",
    is_metered: false,
    flat_rate: 20.0,
    rate_tiers: null,
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  const houses = [
    {
      id: "h-101",
      community_id: DEFAULT_COMMUNITY_ID,
      house_number: "1/1",
      owner_name: "นายสมชาย ใจดี",
      water_meter_id: "M-001",
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: "h-102",
      community_id: DEFAULT_COMMUNITY_ID,
      house_number: "1/2",
      owner_name: "นางสมศรี มีสุข",
      water_meter_id: "M-002",
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: "h-103",
      community_id: DEFAULT_COMMUNITY_ID,
      house_number: "1/3",
      owner_name: "นายสมศักดิ์ รักสงบ",
      water_meter_id: "M-003",
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: "h-201",
      community_id: DEFAULT_COMMUNITY_ID,
      house_number: "2/1",
      owner_name: "นางสาวมาลี ชื่นบาน",
      water_meter_id: "M-004",
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: "h-202",
      community_id: DEFAULT_COMMUNITY_ID,
      house_number: "2/2",
      owner_name: "นายบุญมี มั่งคั่ง",
      water_meter_id: "M-005",
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ];

  const periodId = "bp-current";
  const sampleSlipSvg =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="520" viewBox="0 0 400 520">
        <rect width="400" height="520" rx="16" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
        <rect x="20" y="20" width="360" height="70" rx="12" fill="#059669"/>
        <text x="200" y="52" font-family="sans-serif" font-size="18" font-weight="bold" fill="#ffffff" text-anchor="middle">โอนเงินสำเร็จ (สลิปตัวอย่าง)</text>
        <text x="200" y="75" font-family="sans-serif" font-size="12" fill="#d1fae5" text-anchor="middle">15 ต.ค. 2569 - 10:30 น.</text>
        <text x="40" y="135" font-family="sans-serif" font-size="14" fill="#64748b">จาก: นางสมศรี มีสุข (บ้าน 1/2)</text>
        <text x="40" y="170" font-family="sans-serif" font-size="14" fill="#64748b">ไปยัง: กองทุนสาธารณูปโภคชุมชนบ้านดงคงสุข</text>
        <text x="40" y="205" font-family="sans-serif" font-size="14" fill="#64748b">เลขที่บัญชี: 405-1-23456-7</text>
        <line x1="40" y1="235" x2="360" y2="235" stroke="#e2e8f0" stroke-width="2"/>
        <text x="40" y="280" font-family="sans-serif" font-size="16" font-weight="bold" fill="#1e293b">จำนวนเงิน</text>
        <text x="360" y="280" font-family="monospace" font-size="24" font-weight="bold" fill="#059669" text-anchor="end">135.00 บาท</text>
        <line x1="40" y1="310" x2="360" y2="310" stroke="#e2e8f0" stroke-width="2"/>
        <text x="200" y="460" font-family="monospace" font-size="12" fill="#94a3b8" text-anchor="middle">Ref: DEMO-SLIP-20261020</text>
      </svg>`
    );

  return {
    communities: [
      {
        id: DEFAULT_COMMUNITY_ID,
        name: "บ้านดงคงสุข",
        address: "หมู่ 4 ต.ดงคงสุข อ.เมือง จ.ขอนแก่น 40000",
        bank_name: "ธนาคารกรุงไทย (ออมทรัพย์)",
        bank_account_number: "405-1-23456-7",
        bank_account_name: "กองทุนสาธารณูปโภคชุมชนบ้านดงคงสุข",
        promptpay_id: "0812345678",
        line_channel_id: "2012120719",
        line_liff_id: "2012120719-gOy9l7cH",
        line_channel_secret: "",
        line_channel_access_token: "",
        created_at: now,
        updated_at: now,
      },
    ],
    staff: [
      {
        id: "4b1550b8-32b4-4667-af4a-86c518a6d85c",
        email: "noomjes.si@gmail.com",
        password_hash: DEFAULT_PASSWORD_HASH,
        community_id: DEFAULT_COMMUNITY_ID,
        full_name: "คุณเจษฎา (กรรมการหลัก)",
        role: "community_admin",
        phone: "0812345678",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: "staff-demo-2",
        email: "admin@communex.com",
        password_hash: DEFAULT_PASSWORD_HASH,
        community_id: DEFAULT_COMMUNITY_ID,
        full_name: "ผู้ดูแลระบบ (Demo)",
        role: "community_admin",
        phone: "0899999999",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ],
    houses,
    house_members: [
      {
        id: "hm-1",
        house_id: "h-101",
        line_user_id: "U1234567890abcdef1234567890abcdef",
        display_name: "สมชาย (โหมดจำลอง PC)",
        picture_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
        is_primary: true,
        created_at: now,
      },
      {
        id: "hm-2",
        house_id: "h-102",
        line_user_id: "U_SOMSRI_LINE_002",
        display_name: "แม่สมศรี บ้าน 1/2",
        picture_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
        is_primary: true,
        created_at: now,
      },
    ],
    utility_rates: [waterRate, garbageRate, funeralRate],
    billing_sets: [
      {
        id: "bs-default",
        community_id: DEFAULT_COMMUNITY_ID,
        name: "เก็บค่าบริการปกติประจำเดือน (น้ำ+ขยะ+ฌาปนกิจ)",
        items: [waterRate, garbageRate, funeralRate],
        is_active: true,
        created_at: now,
      },
    ],
    billing_periods: [
      {
        id: periodId,
        community_id: DEFAULT_COMMUNITY_ID,
        period_month: currentMonth,
        period_year: currentYear,
        is_closed: false,
        created_by: "4b1550b8-32b4-4667-af4a-86c518a6d85c",
        funeral_occurrences: 1,
        funeral_events: [
          { id: "fe-1", type: "funeral", name: "งานฌาปนกิจผู้สูงอายุคุ้มเหนือ", amount: 20 },
        ],
        selected_items: [waterRate, garbageRate, funeralRate],
        created_at: now,
      },
    ],
    bills: [
      {
        id: "bill-101",
        billing_period_id: periodId,
        house_id: "h-101",
        total_amount: 120,
        arrears_amount: 0,
        status: "unpaid",
        notified_at: now,
        paid_at: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: "bill-102",
        billing_period_id: periodId,
        house_id: "h-102",
        total_amount: 135,
        arrears_amount: 0,
        status: "pending_verify",
        notified_at: now,
        paid_at: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: "bill-103",
        billing_period_id: periodId,
        house_id: "h-103",
        total_amount: 110,
        arrears_amount: 0,
        status: "paid",
        notified_at: now,
        paid_at: now,
        created_at: now,
        updated_at: now,
      },
    ],
    bill_items: [
      // bill-101 (unpaid)
      {
        id: "bi-101-w",
        bill_id: "bill-101",
        utility_type: "water",
        previous_reading: 100,
        current_reading: 112,
        units_used: 12,
        amount: 60,
        created_at: now,
      },
      {
        id: "bi-101-g",
        bill_id: "bill-101",
        utility_type: "garbage",
        previous_reading: null,
        current_reading: null,
        units_used: null,
        amount: 40,
        created_at: now,
      },
      {
        id: "bi-101-f",
        bill_id: "bill-101",
        utility_type: "funeral",
        previous_reading: null,
        current_reading: null,
        units_used: null,
        amount: 20,
        created_at: now,
      },
      // bill-102 (pending_verify)
      {
        id: "bi-102-w",
        bill_id: "bill-102",
        utility_type: "water",
        previous_reading: 80,
        current_reading: 95,
        units_used: 15,
        amount: 75,
        created_at: now,
      },
      {
        id: "bi-102-g",
        bill_id: "bill-102",
        utility_type: "garbage",
        previous_reading: null,
        current_reading: null,
        units_used: null,
        amount: 40,
        created_at: now,
      },
      {
        id: "bi-102-f",
        bill_id: "bill-102",
        utility_type: "funeral",
        previous_reading: null,
        current_reading: null,
        units_used: null,
        amount: 20,
        created_at: now,
      },
      // bill-103 (paid)
      {
        id: "bi-103-w",
        bill_id: "bill-103",
        utility_type: "water",
        previous_reading: 50,
        current_reading: 60,
        units_used: 10,
        amount: 50,
        created_at: now,
      },
      {
        id: "bi-103-g",
        bill_id: "bill-103",
        utility_type: "garbage",
        previous_reading: null,
        current_reading: null,
        units_used: null,
        amount: 40,
        created_at: now,
      },
      {
        id: "bi-103-f",
        bill_id: "bill-103",
        utility_type: "funeral",
        previous_reading: null,
        current_reading: null,
        units_used: null,
        amount: 20,
        created_at: now,
      },
    ],
    payments: [
      {
        id: "pay-102",
        bill_id: "bill-102",
        house_id: "h-102",
        amount: 135,
        slip_image_url: sampleSlipSvg,
        note: "โอนจากกรุงไทยเรียบร้อยค่ะ",
        paid_at: now,
        verified_at: null,
        verified_by: null,
        created_at: now,
      },
      {
        id: "pay-103",
        bill_id: "bill-103",
        house_id: "h-103",
        amount: 110,
        slip_image_url: sampleSlipSvg,
        note: "จ่ายค่าน้ำเดือนนี้ครับ",
        paid_at: now,
        verified_at: now,
        verified_by: "4b1550b8-32b4-4667-af4a-86c518a6d85c",
        created_at: now,
      },
    ],
  };
}

let memoryDb: DemoDB | null = null;

function loadDb(): DemoDB {
  for (const p of [LOCAL_DEMO_DB_PATH, TMP_DEMO_DB_PATH]) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf-8");
        return JSON.parse(raw);
      }
    } catch {
      // Try next path
    }
  }
  if (!memoryDb) {
    memoryDb = createInitialSeed();
    saveDb(memoryDb);
  }
  return memoryDb;
}

function saveDb(db: DemoDB) {
  memoryDb = db;
  try {
    fs.writeFileSync(LOCAL_DEMO_DB_PATH, JSON.stringify(db, null, 2), "utf-8");
    return;
  } catch {
    // Fallback to os.tmpdir() on Vercel / serverless read-only filesystem
  }
  try {
    fs.writeFileSync(TMP_DEMO_DB_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch {
    // Keep in memoryDb
  }
}

function makeResult<T extends QueryResultRow = any>(rows: any[]): QueryResult<T> {
  return {
    rows: rows as T[],
    rowCount: rows.length,
    command: "SELECT",
    oid: 0,
    fields: [],
  };
}

function getCategoryName(db: DemoDB, communityId: string, utilityType: string): string {
  const rate = db.utility_rates.find(
    (r) => r.community_id === communityId && r.utility_type === utilityType
  );
  if (rate) return rate.name;
  if (utilityType === "water") return "ค่าน้ำประปา";
  if (utilityType === "garbage") return "ค่าเก็บขยะ";
  if (utilityType === "funeral") return "เงินสงเคราะห์ฌาปนกิจ";
  return utilityType;
}

export async function executeDemoQuery<T extends QueryResultRow = any>(
  rawSql: string,
  params: any[] = []
): Promise<QueryResult<T>> {
  const db = loadDb();
  const sql = rawSql.replace(/\s+/g, " ").trim();
  const sqlLower = sql.toLowerCase();
  const now = new Date().toISOString();

  // 0. DDL statements (ALTER TABLE ...)
  if (sqlLower.startsWith("alter table")) {
    return makeResult([]);
  }

  // 1. Auth & Staff Queries
  if (
    sqlLower.includes("from staff where email = $1 and is_active = true")
  ) {
    const email = String(params[0] || "").toLowerCase();
    const rows = db.staff.filter(
      (s) => s.email.toLowerCase() === email && s.is_active !== false
    );
    return makeResult(rows);
  }

  if (sqlLower.includes("select id from staff where email = $1")) {
    const email = String(params[0] || "").toLowerCase();
    const rows = db.staff.filter((s) => s.email.toLowerCase() === email);
    return makeResult(rows);
  }

  if (sqlLower.includes("from staff s left join communities c on s.community_id = c.id where s.id = $1")) {
    const id = params[0];
    const rows = db.staff
      .filter((s) => s.id === id)
      .map((s) => {
        const c = db.communities.find((cm) => cm.id === s.community_id);
        return { ...s, community_name: c?.name || "CommuneX" };
      });
    return makeResult(rows);
  }

  if (sqlLower.includes("from staff where community_id = $1 order by created_at asc")) {
    const rows = db.staff.filter((s) => s.community_id === params[0]);
    return makeResult(rows);
  }

  if (sqlLower.includes("select id from staff where id = $1 and community_id = $2")) {
    const rows = db.staff.filter(
      (s) => s.id === params[0] && s.community_id === params[1]
    );
    return makeResult(rows);
  }

  if (sqlLower.startsWith("insert into staff")) {
    const newStaff = {
      id: crypto.randomUUID(),
      email: params[0],
      password_hash: params[1],
      community_id: params[2],
      full_name: params[3],
      role: params[4] || "committee",
      phone: params[5] || null,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    db.staff.push(newStaff);
    saveDb(db);
    return makeResult([newStaff]);
  }

  if (sqlLower.startsWith("update staff set password_hash = $1, phone = coalesce")) {
    const [hash, phone, id] = params;
    const s = db.staff.find((st) => st.id === id);
    if (s) {
      s.password_hash = hash;
      if (phone) s.phone = phone;
      s.updated_at = now;
      saveDb(db);
    }
    return makeResult([]);
  }

  if (sqlLower.startsWith("update staff set")) {
    // Dynamic update from /api/admin/staff PUT
    const staffId = params[params.length - 2];
    const communityId = params[params.length - 1];
    const s = db.staff.find(
      (st) => st.id === staffId && st.community_id === communityId
    );
    if (s) {
      let idx = 0;
      if (sqlLower.includes("full_name =")) s.full_name = params[idx++];
      if (sqlLower.includes("phone =")) s.phone = params[idx++];
      if (sqlLower.includes("password_hash =")) s.password_hash = params[idx++];
      s.updated_at = now;
      saveDb(db);
    }
    return makeResult([]);
  }

  if (sqlLower.startsWith("delete from staff where id = $1")) {
    db.staff = db.staff.filter(
      (s) => !(s.id === params[0] && s.community_id === params[1])
    );
    saveDb(db);
    return makeResult([]);
  }

  // 2. Communities Queries
  if (sqlLower.startsWith("insert into communities (name)")) {
    const newComm = {
      id: crypto.randomUUID(),
      name: params[0],
      address: null,
      created_at: now,
      updated_at: now,
    };
    db.communities.push(newComm);
    saveDb(db);
    return makeResult([newComm]);
  }

  if (sqlLower.includes("from communities where id = $1")) {
    const rows = db.communities.filter((c) => c.id === params[0]);
    return makeResult(rows);
  }

  if (sqlLower.includes("from communities where line_liff_id is not null limit 1")) {
    const rows = db.communities.filter((c) => c.line_liff_id).slice(0, 1);
    return makeResult(rows);
  }

  if (sqlLower.includes("from communities where line_channel_id is not null limit 1")) {
    const rows = db.communities.filter((c) => c.line_channel_id).slice(0, 1);
    return makeResult(rows);
  }

  if (sqlLower.includes("select id, name from communities order by name asc")) {
    return makeResult(db.communities);
  }

  if (sqlLower.startsWith("update communities set")) {
    const id = params[params.length - 1];
    const c = db.communities.find((cm) => cm.id === id);
    if (c) {
      c.name = params[0];
      c.address = params[1];
      c.line_channel_id = params[2];
      c.line_liff_id = params[3];
      c.line_channel_secret = params[4];
      c.line_channel_access_token = params[5];
      if (params.length >= 11) {
        c.bank_name = params[6];
        c.bank_account_number = params[7];
        c.bank_account_name = params[8];
        c.promptpay_id = params[9];
      }
      c.updated_at = now;
      saveDb(db);
    }
    return makeResult([]);
  }

  // 3. Dashboard Queries
  if (sqlLower.includes("total_collected") && sqlLower.includes("from bills b")) {
    const commId = params[0];
    const periodIds = new Set(
      db.billing_periods.filter((bp) => bp.community_id === commId).map((bp) => bp.id)
    );
    const commBills = db.bills.filter((b) => periodIds.has(b.billing_period_id));
    let totalCollected = 0;
    let totalOutstanding = 0;
    let totalBilled = 0;
    let paidCount = 0;
    let unpaidCount = 0;

    commBills.forEach((b) => {
      const amt = Number(b.total_amount) || 0;
      totalBilled += amt;
      if (b.status === "paid") {
        totalCollected += amt;
        paidCount++;
      } else if (b.status === "unpaid" || b.status === "overdue") {
        totalOutstanding += amt;
        unpaidCount++;
      }
    });

    return makeResult([
      {
        total_collected: totalCollected,
        total_outstanding: totalOutstanding,
        total_billed: totalBilled,
        paid_count: paidCount,
        unpaid_count: unpaidCount,
        total_bills: commBills.length,
      },
    ]);
  }

  if (sqlLower.includes("as category_name") && sqlLower.includes("group by bi.utility_type")) {
    const commId = params[0];
    const periodIds = new Set(
      db.billing_periods.filter((bp) => bp.community_id === commId).map((bp) => bp.id)
    );
    const paidBillIds = new Set(
      db.bills
        .filter((b) => periodIds.has(b.billing_period_id) && b.status === "paid")
        .map((b) => b.id)
    );
    const map: Record<string, { utility_type: string; category_name: string; total_amount: number; item_count: number }> = {};
    db.bill_items
      .filter((bi) => paidBillIds.has(bi.bill_id))
      .forEach((bi) => {
        if (!map[bi.utility_type]) {
          map[bi.utility_type] = {
            utility_type: bi.utility_type,
            category_name: getCategoryName(db, commId, bi.utility_type),
            total_amount: 0,
            item_count: 0,
          };
        }
        map[bi.utility_type].total_amount += Number(bi.amount) || 0;
        map[bi.utility_type].item_count += 1;
      });

    const rows = Object.values(map).sort((a, b) => b.total_amount - a.total_amount);
    return makeResult(rows);
  }

  if (sqlLower.includes("group by bp.period_month") && sqlLower.includes("order by bp.period_month asc")) {
    const [commId, year] = params;
    const periods = db.billing_periods
      .filter((bp) => bp.community_id === commId && Number(bp.period_year) === Number(year))
      .sort((a, b) => a.period_month - b.period_month);

    const rows = periods.map((bp) => {
      const pBills = db.bills.filter((b) => b.billing_period_id === bp.id);
      const paidAmount = pBills
        .filter((b) => b.status === "paid")
        .reduce((s, b) => s + Number(b.total_amount || 0), 0);
      const unpaidAmount = pBills
        .filter((b) => b.status === "unpaid" || b.status === "overdue")
        .reduce((s, b) => s + Number(b.total_amount || 0), 0);
      return {
        period_month: bp.period_month,
        paid_amount: paidAmount,
        unpaid_amount: unpaidAmount,
        bills_count: pBills.length,
      };
    });
    return makeResult(rows);
  }

  if (sqlLower.includes("order by total_arrears desc, unpaid_months desc")) {
    const commId = params[0];
    const houses = db.houses.filter((h) => h.community_id === commId);
    const rows: any[] = [];
    houses.forEach((h) => {
      const unpaidBills = db.bills.filter(
        (b) => b.house_id === h.id && (b.status === "unpaid" || b.status === "overdue")
      );
      if (unpaidBills.length > 0) {
        const totalArrears = unpaidBills.reduce((s, b) => s + Number(b.total_amount || 0), 0);
        rows.push({
          house_id: h.id,
          house_number: h.house_number,
          owner_name: h.owner_name,
          water_meter_id: h.water_meter_id,
          unpaid_months: unpaidBills.length,
          total_arrears: totalArrears,
        });
      }
    });
    rows.sort((a, b) => b.total_arrears - a.total_arrears);
    return makeResult(rows);
  }

  // 4. Houses & House Members Queries
  if (sqlLower.includes("from houses where community_id = $1 and is_active = true order by house_number asc")) {
    const rows = db.houses
      .filter((h) => h.community_id === params[0] && h.is_active !== false)
      .sort((a, b) => String(a.house_number).localeCompare(String(b.house_number)));
    return makeResult(rows);
  }

  if (sqlLower.includes("from house_members where house_id = any($1)")) {
    const ids = new Set(params[0] || []);
    const rows = db.house_members.filter((m) => ids.has(m.house_id));
    return makeResult(rows);
  }

  if (sqlLower.includes("select line_user_id from house_members where house_id = $1")) {
    const rows = db.house_members.filter((m) => m.house_id === params[0]);
    return makeResult(rows);
  }

  if (sqlLower.startsWith("insert into houses (community_id, house_number, owner_name, water_meter_id)")) {
    const newHouse = {
      id: crypto.randomUUID(),
      community_id: params[0],
      house_number: params[1],
      owner_name: params[2],
      water_meter_id: params[3],
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    db.houses.push(newHouse);
    saveDb(db);
    return makeResult([newHouse]);
  }

  if (sqlLower.startsWith("insert into houses (community_id, house_number, owner_name)")) {
    const newHouse = {
      id: crypto.randomUUID(),
      community_id: params[0],
      house_number: params[1],
      owner_name: params[2],
      water_meter_id: null,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    db.houses.push(newHouse);
    saveDb(db);
    return makeResult([newHouse]);
  }

  if (sqlLower.startsWith("update houses set house_number = $1")) {
    const [houseNumber, ownerName, waterMeterId, id] = params;
    const h = db.houses.find((item) => item.id === id);
    if (h) {
      h.house_number = houseNumber;
      h.owner_name = ownerName;
      h.water_meter_id = waterMeterId;
      h.updated_at = now;
      saveDb(db);
      return makeResult([h]);
    }
    return makeResult([]);
  }

  if (sqlLower.startsWith("delete from houses where id = $1")) {
    const id = params[0];
    db.houses = db.houses.filter((h) => h.id !== id);
    db.house_members = db.house_members.filter((hm) => hm.house_id !== id);
    db.bills = db.bills.filter((b) => b.house_id !== id);
    saveDb(db);
    return makeResult([]);
  }

  // 5. Utility Rates Queries
  if (sqlLower.includes("from utility_rates where community_id = $1 and is_active = true")) {
    const rows = db.utility_rates.filter(
      (r) => r.community_id === params[0] && r.is_active !== false
    );
    return makeResult(rows);
  }

  if (sqlLower.startsWith("update utility_rates set name = $1")) {
    const [name, isMetered, flatRate, rateTiers, id, commId] = params;
    const r = db.utility_rates.find((item) => item.id === id && item.community_id === commId);
    if (r) {
      r.name = name;
      r.is_metered = isMetered;
      r.flat_rate = flatRate;
      r.rate_tiers = typeof rateTiers === "string" ? JSON.parse(rateTiers) : rateTiers;
      r.updated_at = now;
      saveDb(db);
      return makeResult([r]);
    }
    return makeResult([]);
  }

  if (sqlLower.startsWith("insert into utility_rates")) {
    const [commId, utilityType, name, isMetered, flatRate, rateTiers] = params;
    const newRate = {
      id: crypto.randomUUID(),
      community_id: commId,
      utility_type: utilityType,
      name,
      is_metered: isMetered,
      flat_rate: flatRate,
      rate_tiers: typeof rateTiers === "string" ? JSON.parse(rateTiers) : rateTiers,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    db.utility_rates.push(newRate);
    saveDb(db);
    return makeResult([newRate]);
  }

  if (sqlLower.startsWith("update utility_rates set is_active = false")) {
    const [id, commId] = params;
    const r = db.utility_rates.find((item) => item.id === id && item.community_id === commId);
    if (r) {
      r.is_active = false;
      saveDb(db);
    }
    return makeResult([]);
  }

  // 6. Billing Sets Queries
  if (sqlLower.includes("from billing_sets where community_id = $1 and is_active = true")) {
    const rows = db.billing_sets.filter(
      (bs) => bs.community_id === params[0] && bs.is_active !== false
    );
    return makeResult(rows);
  }

  if (sqlLower.startsWith("update billing_sets set name = $1")) {
    const [name, itemsJson, id, commId] = params;
    const bs = db.billing_sets.find((item) => item.id === id && item.community_id === commId);
    if (bs) {
      bs.name = name;
      bs.items = typeof itemsJson === "string" ? JSON.parse(itemsJson) : itemsJson;
      saveDb(db);
      return makeResult([bs]);
    }
    return makeResult([]);
  }

  if (sqlLower.startsWith("insert into billing_sets")) {
    const [commId, name, itemsJson] = params;
    const newSet = {
      id: crypto.randomUUID(),
      community_id: commId,
      name,
      items: typeof itemsJson === "string" ? JSON.parse(itemsJson) : itemsJson,
      is_active: true,
      created_at: now,
    };
    db.billing_sets.push(newSet);
    saveDb(db);
    return makeResult([newSet]);
  }

  if (sqlLower.startsWith("update billing_sets set is_active = false")) {
    const [id, commId] = params;
    const bs = db.billing_sets.find((item) => item.id === id && item.community_id === commId);
    if (bs) {
      bs.is_active = false;
      saveDb(db);
    }
    return makeResult([]);
  }

  // 7. Billing Periods & Bills Queries
  if (sqlLower.includes("from billing_periods where community_id = $1 order by period_year desc, period_month desc limit 1")) {
    const rows = db.billing_periods
      .filter((bp) => bp.community_id === params[0])
      .sort((a, b) => b.period_year - a.period_year || b.period_month - a.period_month)
      .slice(0, 1);
    return makeResult(rows);
  }

  if (sqlLower.includes("from billing_periods where community_id = $1 and period_month = $2 and period_year = $3")) {
    const [commId, month, year] = params;
    const rows = db.billing_periods.filter(
      (bp) =>
        bp.community_id === commId &&
        Number(bp.period_month) === Number(month) &&
        Number(bp.period_year) === Number(year)
    );
    return makeResult(rows);
  }

  if (sqlLower.startsWith("insert into billing_periods")) {
    const [commId, month, year, createdBy] = params;
    const newPeriod = {
      id: crypto.randomUUID(),
      community_id: commId,
      period_month: Number(month),
      period_year: Number(year),
      is_closed: false,
      created_by: createdBy,
      funeral_occurrences: 0,
      funeral_events: [],
      selected_items: [],
      created_at: now,
    };
    db.billing_periods.push(newPeriod);
    saveDb(db);
    return makeResult([newPeriod]);
  }

  if (sqlLower.startsWith("update billing_periods set selected_items = $1")) {
    const [itemsJson, id, commId] = params;
    const bp = db.billing_periods.find((p) => p.id === id && p.community_id === commId);
    if (bp) {
      bp.selected_items = typeof itemsJson === "string" ? JSON.parse(itemsJson) : itemsJson;
      saveDb(db);
    }
    return makeResult([]);
  }

  if (sqlLower.startsWith("update billing_periods set funeral_events = $1")) {
    const [eventsJson, occurrences, id, commId] = params;
    const bp = db.billing_periods.find((p) => p.id === id && p.community_id === commId);
    if (bp) {
      bp.funeral_events = typeof eventsJson === "string" ? JSON.parse(eventsJson) : eventsJson;
      bp.funeral_occurrences = occurrences;
      saveDb(db);
    }
    return makeResult([]);
  }

  if (sqlLower.startsWith("update billing_periods set is_closed = $1")) {
    const [isClosed, id, commId] = params;
    const bp = db.billing_periods.find((p) => p.id === id && p.community_id === commId);
    if (bp) {
      bp.is_closed = isClosed;
      saveDb(db);
    }
    return makeResult([]);
  }

  if (sqlLower.includes("select * from bills where billing_period_id = $1")) {
    const rows = db.bills.filter((b) => b.billing_period_id === params[0]);
    return makeResult(rows);
  }

  if (sqlLower.includes("select * from bill_items where bill_id = any($1)")) {
    const ids = new Set(params[0] || []);
    const rows = db.bill_items.filter((bi) => ids.has(bi.bill_id));
    return makeResult(rows);
  }

  if (sqlLower.includes("where b.billing_period_id = $1 and bi.current_reading is not null")) {
    const periodId = params[0];
    const periodBills = db.bills.filter((b) => b.billing_period_id === periodId);
    const rows: any[] = [];
    periodBills.forEach((b) => {
      db.bill_items
        .filter((bi) => bi.bill_id === b.id && bi.current_reading !== null)
        .forEach((bi) => {
          rows.push({
            house_id: b.house_id,
            utility_type: bi.utility_type,
            current_reading: bi.current_reading,
          });
        });
    });
    return makeResult(rows);
  }

  if (sqlLower.includes("where b.billing_period_id = $1 and bi.utility_type = 'water'")) {
    const periodId = params[0];
    const periodBills = db.bills.filter((b) => b.billing_period_id === periodId);
    const rows: any[] = [];
    periodBills.forEach((b) => {
      db.bill_items
        .filter(
          (bi) =>
            bi.bill_id === b.id &&
            bi.utility_type === "water" &&
            bi.current_reading !== null
        )
        .forEach((bi) => {
          rows.push({
            house_id: b.house_id,
            current_reading: bi.current_reading,
          });
        });
    });
    return makeResult(rows);
  }

  if (sqlLower.includes("select b.house_id, coalesce(sum(b.total_amount), 0) as total_arrears")) {
    const [commId, year, month] = params;
    const prevPeriods = new Set(
      db.billing_periods
        .filter(
          (bp) =>
            bp.community_id === commId &&
            (bp.period_year < year || (bp.period_year === year && bp.period_month < month))
        )
        .map((bp) => bp.id)
    );
    const map: Record<string, { house_id: string; total_arrears: number; unpaid_months: number }> = {};
    db.bills
      .filter(
        (b) =>
          prevPeriods.has(b.billing_period_id) &&
          (b.status === "unpaid" || b.status === "overdue")
      )
      .forEach((b) => {
        if (!map[b.house_id]) {
          map[b.house_id] = { house_id: b.house_id, total_arrears: 0, unpaid_months: 0 };
        }
        map[b.house_id].total_arrears += Number(b.total_amount) || 0;
        map[b.house_id].unpaid_months += 1;
      });
    return makeResult(Object.values(map));
  }

  if (sqlLower.startsWith("update bills set total_amount = $1")) {
    const [totalAmount, arrearsAmount, status, billId] = params;
    const b = db.bills.find((item) => item.id === billId);
    if (b) {
      b.total_amount = Number(totalAmount);
      b.arrears_amount = Number(arrearsAmount);
      b.status = status;
      b.updated_at = now;
      saveDb(db);
    }
    return makeResult([]);
  }

  if (sqlLower.startsWith("insert into bills (billing_period_id, house_id, total_amount, arrears_amount, status)")) {
    const [billingPeriodId, houseId, totalAmount, arrearsAmount, status] = params;
    const newBill = {
      id: crypto.randomUUID(),
      billing_period_id: billingPeriodId,
      house_id: houseId,
      total_amount: Number(totalAmount),
      arrears_amount: Number(arrearsAmount),
      status,
      notified_at: null,
      paid_at: null,
      created_at: now,
      updated_at: now,
    };
    db.bills.push(newBill);
    saveDb(db);
    return makeResult([newBill]);
  }

  if (sqlLower.startsWith("delete from bill_items where bill_id = $1")) {
    db.bill_items = db.bill_items.filter((bi) => bi.bill_id !== params[0]);
    saveDb(db);
    return makeResult([]);
  }

  if (sqlLower.startsWith("insert into bill_items")) {
    const [billId, utilityType, prev, curr, units, amount] = params;
    const newItem = {
      id: crypto.randomUUID(),
      bill_id: billId,
      utility_type: utilityType,
      previous_reading: prev,
      current_reading: curr,
      units_used: units,
      amount: Number(amount),
      created_at: now,
    };
    db.bill_items.push(newItem);
    saveDb(db);
    return makeResult([newItem]);
  }

  // 8. Payments & Verification Queries
  if (sqlLower.includes("from payments p") && sqlLower.includes("where p.verified_at is null")) {
    const rows = db.payments
      .filter((p) => !p.verified_at)
      .map((p) => {
        const h = db.houses.find((item) => item.id === p.house_id);
        const b = db.bills.find((item) => item.id === p.bill_id);
        const bp = db.billing_periods.find((item) => item.id === b?.billing_period_id);
        return {
          payment_id: p.id,
          bill_id: p.bill_id,
          house_id: p.house_id,
          paid_amount: p.amount,
          slip_image_url: p.slip_image_url,
          paid_at: p.paid_at,
          note: p.note,
          house_number: h?.house_number || "-",
          owner_name: h?.owner_name || "-",
          bill_amount: b?.total_amount || p.amount,
          bill_status: b?.status || "pending_verify",
          period_month: bp?.period_month || 1,
          period_year: bp?.period_year || new Date().getFullYear(),
        };
      });
    return makeResult(rows);
  }

  if (sqlLower.startsWith("update payments set verified_at = now()")) {
    const [userId, paymentId] = params;
    const p = db.payments.find((item) => item.id === paymentId);
    if (p) {
      p.verified_at = now;
      p.verified_by = userId;
      saveDb(db);
    }
    return makeResult([]);
  }

  if (sqlLower.startsWith("update bills set status = 'paid'")) {
    const b = db.bills.find((item) => item.id === params[0]);
    if (b) {
      b.status = "paid";
      b.paid_at = now;
      b.updated_at = now;
      saveDb(db);
    }
    return makeResult([]);
  }

  if (sqlLower.startsWith("delete from payments where id = $1")) {
    db.payments = db.payments.filter((p) => p.id !== params[0]);
    saveDb(db);
    return makeResult([]);
  }

  if (sqlLower.startsWith("update bills set status = 'unpaid'")) {
    const b = db.bills.find((item) => item.id === params[0]);
    if (b) {
      b.status = "unpaid";
      b.updated_at = now;
      saveDb(db);
    }
    return makeResult([]);
  }

  if (sqlLower.startsWith("insert into payments (bill_id, house_id, amount, slip_image_url, note, paid_at)")) {
    const [billId, houseId, amount, slipImageUrl, note] = params;
    const newPay = {
      id: crypto.randomUUID(),
      bill_id: billId,
      house_id: houseId,
      amount: Number(amount),
      slip_image_url: slipImageUrl,
      note,
      paid_at: now,
      verified_at: null,
      verified_by: null,
      created_at: now,
    };
    db.payments.push(newPay);
    saveDb(db);
    return makeResult([newPay]);
  }

  if (sqlLower.startsWith("update bills set status = 'pending_verify'")) {
    const b = db.bills.find((item) => item.id === params[0]);
    if (b) {
      b.status = "pending_verify";
      b.updated_at = now;
      saveDb(db);
    }
    return makeResult([]);
  }

  // 9. LIFF Queries
  if (sqlLower.includes("from house_members hm") && sqlLower.includes("where hm.line_user_id = $1")) {
    const lineUserId = params[0];
    const hm = db.house_members.find((m) => m.line_user_id === lineUserId);
    if (!hm) return makeResult([]);
    const h = db.houses.find((item) => item.id === hm.house_id);
    if (!h) return makeResult([]);
    const c = db.communities.find((item) => item.id === h.community_id);
    return makeResult([
      {
        member_id: hm.id,
        house_id: h.id,
        line_user_id: hm.line_user_id,
        house_number: h.house_number,
        owner_name: h.owner_name,
        community_id: h.community_id,
        community_name: c?.name || "CommuneX",
        bank_name: c?.bank_name || null,
        bank_account_number: c?.bank_account_number || null,
        bank_account_name: c?.bank_account_name || null,
        promptpay_id: c?.promptpay_id || null,
      },
    ]);
  }

  if (sqlLower.includes("where b.house_id = $1 and b.id = $2")) {
    const [houseId, billId] = params;
    const rows = db.bills
      .filter((b) => b.house_id === houseId && b.id === billId)
      .map((b) => {
        const bp = db.billing_periods.find((p) => p.id === b.billing_period_id);
        return {
          ...b,
          period_month: bp?.period_month || 1,
          period_year: bp?.period_year || new Date().getFullYear(),
          is_closed: bp?.is_closed || false,
          funeral_events: bp?.funeral_events || [],
        };
      });
    return makeResult(rows);
  }

  if (sqlLower.includes("where b.house_id = $1 and b.status in ('unpaid', 'pending_verify')")) {
    const houseId = params[0];
    const rows = db.bills
      .filter(
        (b) =>
          b.house_id === houseId &&
          (b.status === "unpaid" || b.status === "pending_verify")
      )
      .map((b) => {
        const bp = db.billing_periods.find((p) => p.id === b.billing_period_id);
        return {
          ...b,
          period_month: bp?.period_month || 1,
          period_year: bp?.period_year || new Date().getFullYear(),
          is_closed: bp?.is_closed || false,
          funeral_events: bp?.funeral_events || [],
        };
      });
    return makeResult(rows);
  }

  if (sqlLower.includes("where b.house_id = $1 and b.status = 'paid'")) {
    const houseId = params[0];
    const rows = db.bills
      .filter((b) => b.house_id === houseId && b.status === "paid")
      .map((b) => {
        const bp = db.billing_periods.find((p) => p.id === b.billing_period_id);
        return {
          ...b,
          period_month: bp?.period_month || 1,
          period_year: bp?.period_year || new Date().getFullYear(),
        };
      });
    return makeResult(rows);
  }

  if (sqlLower.includes("from bill_items bi") && sqlLower.includes("where bi.bill_id = any($1)")) {
    const ids = new Set(params[0] || []);
    const rows = db.bill_items
      .filter((bi) => ids.has(bi.bill_id))
      .map((bi) => {
        const ur = db.utility_rates.find((r) => r.utility_type === bi.utility_type);
        return {
          ...bi,
          name:
            ur?.name ||
            (bi.utility_type === "water"
              ? "ค่าน้ำประปา"
              : bi.utility_type === "garbage"
              ? "ค่าเก็บขยะ"
              : bi.utility_type === "funeral"
              ? "เงินสงเคราะห์ฌาปนกิจ"
              : bi.utility_type),
          is_metered: ur ? ur.is_metered : bi.previous_reading !== null,
        };
      });
    return makeResult(rows);
  }

  if (sqlLower.includes("select id, bill_id, paid_at, verified_at from payments where bill_id = any($1)")) {
    const ids = new Set(params[0] || []);
    const rows = db.payments.filter((p) => ids.has(p.bill_id));
    return makeResult(rows);
  }

  if (sqlLower.includes("from houses h join communities c on h.community_id = c.id where h.community_id = $1 and h.house_number = $2")) {
    const [commId, houseNumber] = params;
    const rows = db.houses
      .filter(
        (h) =>
          h.community_id === commId &&
          h.house_number === houseNumber &&
          h.is_active !== false
      )
      .map((h) => {
        const c = db.communities.find((cm) => cm.id === h.community_id);
        return { ...h, community_name: c?.name || "CommuneX" };
      });
    return makeResult(rows);
  }

  if (sqlLower.includes("select id from houses where community_id = $1 and house_number = $2")) {
    const [commId, houseNumber] = params;
    const rows = db.houses.filter(
      (h) => h.community_id === commId && h.house_number === houseNumber
    );
    return makeResult(rows);
  }

  if (sqlLower.includes("select id from house_members where line_user_id = $1")) {
    const rows = db.house_members.filter((hm) => hm.line_user_id === params[0]);
    return makeResult(rows);
  }

  if (sqlLower.startsWith("update house_members set house_id = $1")) {
    const [houseId, displayName, pictureUrl, lineUserId] = params;
    const hm = db.house_members.find((m) => m.line_user_id === lineUserId);
    if (hm) {
      hm.house_id = houseId;
      hm.display_name = displayName;
      hm.picture_url = pictureUrl;
      saveDb(db);
    }
    return makeResult([]);
  }

  if (sqlLower.startsWith("insert into house_members")) {
    const [houseId, lineUserId, displayName, pictureUrl, isPrimary] = params;
    const newHm = {
      id: crypto.randomUUID(),
      house_id: houseId,
      line_user_id: lineUserId,
      display_name: displayName,
      picture_url: pictureUrl,
      is_primary: isPrimary,
      created_at: now,
    };
    db.house_members.push(newHm);
    saveDb(db);
    return makeResult([newHm]);
  }

  if (sqlLower.startsWith("delete from house_members where id = $1")) {
    db.house_members = db.house_members.filter((hm) => hm.id !== params[0]);
    saveDb(db);
    return makeResult([]);
  }

  // 10. LINE Notify Bill Queries
  if (sqlLower.includes("from bills b") && sqlLower.includes("where b.id = $1")) {
    const billId = params[0];
    const b = db.bills.find((item) => item.id === billId);
    if (!b) return makeResult([]);
    const bp = db.billing_periods.find((item) => item.id === b.billing_period_id);
    const h = db.houses.find((item) => item.id === b.house_id);
    const c = db.communities.find((item) => item.id === h?.community_id);
    return makeResult([
      {
        ...b,
        period_month: bp?.period_month || 1,
        period_year: bp?.period_year || new Date().getFullYear(),
        house_number: h?.house_number || "-",
        owner_name: h?.owner_name || "-",
        house_id: h?.id,
        community_id: h?.community_id,
        community_name: c?.name || "CommuneX",
        line_channel_access_token: c?.line_channel_access_token || null,
        line_liff_id: c?.line_liff_id || null,
      },
    ]);
  }

  if (sqlLower.includes("from bill_items bi") && sqlLower.includes("where bi.bill_id = $1")) {
    const [billId, commId] = params;
    const rows = db.bill_items
      .filter((bi) => bi.bill_id === billId)
      .map((bi) => ({
        utility_type: bi.utility_type,
        amount: bi.amount,
        name: getCategoryName(db, commId, bi.utility_type),
      }));
    return makeResult(rows);
  }

  if (sqlLower.startsWith("update bills set notified_at = now()")) {
    const b = db.bills.find((item) => item.id === params[0]);
    if (b) {
      b.notified_at = now;
      saveDb(db);
    }
    return makeResult([]);
  }

  return makeResult([]);
}
