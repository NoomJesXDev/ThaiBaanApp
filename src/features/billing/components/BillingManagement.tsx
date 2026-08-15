"use client";

import React, { useState, useEffect } from "react";

interface House {
  id: string;
  house_number: string;
  owner_name: string | null;
  water_meter_id: string | null;
}

interface UtilityRate {
  id: string;
  utility_type: string;
  name: string;
  is_metered: boolean;
  flat_rate: number | null;
  rate_tiers: any;
}

interface BillingSet {
  id: string;
  name: string;
  items: UtilityRate[];
  is_active: boolean;
}

interface BillingManagementProps {
  houses: House[];
  rates: UtilityRate[];
  previousReadings: Record<string, number>;
  communityId: string;
  staffId: string;
}

interface DynamicBillItem {
  utility_type: string;
  name: string;
  is_metered: boolean;
  previous_reading: number;
  current_reading: string;
  units_used: number;
  amount: number;
}

interface BillState {
  id?: string;
  house_id: string;
  house_number: string;
  owner_name: string;
  items: Record<string, DynamicBillItem>;
  arrears_amount: number;
  unpaid_months?: number;
  total_amount: number;
  status: "unpaid" | "pending_verify" | "paid" | "overdue";
  saved: boolean;
  notified: boolean;
}

const MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

interface SpecialEventItem {
  id: string;
  type?: string;
  name: string;
  amount: number;
}

export default function BillingManagement({
  houses,
  rates,
  previousReadings,
  communityId,
  staffId,
}: BillingManagementProps) {
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();

  const [selectedMonth, setSelectedMonth] = useState(currentMonthIdx + 1);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  
  // Billing Period states
  const [billingPeriodId, setBillingPeriodId] = useState<string | null>(null);
  const [bills, setBills] = useState<BillState[]>([]);
  const [selectedItems, setSelectedItems] = useState<UtilityRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [periodClosed, setPeriodClosed] = useState(false);
  
  // Occasional / Special collection items (formerly Funeral Events)
  const [funeralOccurrences, setFuneralOccurrences] = useState<number>(0);
  const [funeralEvents, setFuneralEvents] = useState<SpecialEventItem[]>([]);
  const [isFuneralModalOpen, setIsFuneralModalOpen] = useState(false);
  const [tempFuneralEvents, setTempFuneralEvents] = useState<SpecialEventItem[]>([]);
  
  // Billing Sets states
  const [billingSets, setBillingSets] = useState<BillingSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string>("");
  const [isSetConfigModalOpen, setIsSetConfigModalOpen] = useState(false);
  const [tempSetName, setTempSetName] = useState("");
  const [tempSelectedRateIds, setTempSelectedRateIds] = useState<string[]>([]);
  const [savingSet, setSavingSet] = useState(false);

  // Fetch Billing Sets
  const fetchBillingSets = async () => {
    try {
      const res = await fetch("/api/billing/sets");
      const data = await res.json();
      if (res.ok) {
        setBillingSets(data.sets || []);
      }
    } catch (err) {
      console.error("Error loading billing sets", err);
    }
  };

  useEffect(() => {
    fetchBillingSets();
  }, []);

  // Load or create billing period
  const loadBillingPeriod = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/billing/period?month=${selectedMonth}&year=${selectedYear}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาดในการโหลดรอบบิล");

      const period = data.period;
      const existingBills = data.bills;
      const prevReadingsMap = data.prevReadings || {};

      setBillingPeriodId(period.id);
      setPeriodClosed(period.is_closed);
      setFuneralOccurrences(period.funeral_occurrences || 0);
      setFuneralEvents(period.funeral_events || []);
      
      const activeItems = period.selected_items || [];
      setSelectedItems(activeItems);
      const arrearsMap = data.arrearsMap || {};

      // If active items are defined for the period, initialize bills
      if (activeItems.length > 0) {
        const initialBills = houses.map((house) => {
          const existingBill = existingBills.find((b: any) => b.house_id === house.id);
          const houseArrears = existingBill?.arrears_amount !== undefined && existingBill?.arrears_amount !== null
            ? Number(existingBill.arrears_amount)
            : Number(arrearsMap[house.id]?.total_arrears || 0);
          const unpaidMonths = arrearsMap[house.id]?.unpaid_months || 0;
          
          const itemsMap: Record<string, DynamicBillItem> = {};
          
          activeItems.forEach((item: any) => {
            const savedItem = existingBill?.bill_items?.find((bi: any) => bi.utility_type === item.utility_type);
            
            let prevReading = 0;
            if (item.is_metered) {
              prevReading = savedItem?.previous_reading !== null && savedItem?.previous_reading !== undefined
                ? Number(savedItem.previous_reading)
                : Number(prevReadingsMap[house.id]?.[item.utility_type] || 0);
            }
            
            let currentReading = "";
            if (item.is_metered && savedItem?.current_reading !== null && savedItem?.current_reading !== undefined) {
              currentReading = String(savedItem.current_reading);
            }

            let unitsUsed = 0;
            if (item.is_metered && savedItem?.units_used !== null && savedItem?.units_used !== undefined) {
              unitsUsed = Number(savedItem.units_used);
            }

            let amount = 0;
            if (savedItem) {
              amount = Number(savedItem.amount);
            } else {
              if (item.is_metered) {
                amount = 0;
              } else if (item.utility_type === "funeral") {
                const totalFuneral = (period.funeral_events || []).reduce((sum: number, ev: any) => sum + (Number(ev.amount) || 0), 0);
                amount = totalFuneral;
              } else {
                amount = Number(item.flat_rate || 0);
              }
            }

            itemsMap[item.utility_type] = {
              utility_type: item.utility_type,
              name: item.name,
              is_metered: item.is_metered,
              previous_reading: prevReading,
              current_reading: currentReading,
              units_used: unitsUsed,
              amount: amount
            };
          });

          const itemsTotal = Object.values(itemsMap).reduce((sum, it) => sum + it.amount, 0);
          const total = itemsTotal + houseArrears;

          if (existingBill) {
            return {
              id: existingBill.id,
              house_id: house.id,
              house_number: house.house_number,
              owner_name: house.owner_name || "-",
              items: itemsMap,
              arrears_amount: houseArrears,
              unpaid_months: unpaidMonths,
              total_amount: Number(existingBill.total_amount),
              status: existingBill.status as BillState['status'],
              saved: true,
              notified: !!existingBill.notified_at,
            };
          } else {
            return {
              house_id: house.id,
              house_number: house.house_number,
              owner_name: house.owner_name || "-",
              items: itemsMap,
              arrears_amount: houseArrears,
              unpaid_months: unpaidMonths,
              total_amount: total,
              status: "unpaid" as BillState['status'],
              saved: false,
              notified: false,
            };
          }
        });

        setBills(initialBills);
      } else {
        setBills([]);
      }
    } catch (err: any) {
      alert("โหลดข้อมูลรอบบิลไม่สำเร็จ: " + (err.message || "เกิดข้อผิดพลาด"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingPeriod();
  }, [selectedMonth, selectedYear]);

  // Save billing set config
  const handleSaveBillingSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempSetName.trim() || tempSelectedRateIds.length === 0) {
      alert("กรุณากรอกชื่อชุดรายการและเลือกอย่างน้อย 1 รายการ");
      return;
    }

    setSavingSet(true);
    const selectedRates = rates.filter((r) => tempSelectedRateIds.includes(r.id));

    try {
      const res = await fetch("/api/billing/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tempSetName,
          items: selectedRates,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "เกิดข้อผิดพลาด");
      }

      await fetchBillingSets();
      setIsSetConfigModalOpen(false);
    } catch (err: any) {
      alert("บันทึกชุดรายการไม่สำเร็จ: " + err.message);
    } finally {
      setSavingSet(false);
    }
  };

  // Apply Selected Billing Set to Period
  const handleApplyBillingSet = async () => {
    if (!selectedSetId || !billingPeriodId) return;
    const targetSet = billingSets.find((s) => s.id === selectedSetId);
    if (!targetSet) return;

    setLoading(true);
    try {
      const res = await fetch("/api/billing/period", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: billingPeriodId,
          selectedItems: targetSet.items,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "ไม่สามารถเปิดรอบบิลนี้ได้");
      }

      await loadBillingPeriod();
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message);
      setLoading(false);
    }
  };

  // Close billing period manually
  const handleClosePeriod = async () => {
    if (!billingPeriodId) return;
    const confirmClose = confirm(
      "คุณต้องการที่จะ ปิดชุดรายการเก็บเงิน / ปิดรอบบิล ประจำรอบนี้ใช่หรือไม่? บิลทั้งหมดจะถูกล็อกและไม่สามารถแก้ไขได้อีกต่อไป"
    );
    if (!confirmClose) return;

    setLoading(true);
    try {
      const res = await fetch("/api/billing/period", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: billingPeriodId,
          isClosed: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "ไม่สามารถปิดรอบบิลได้");
      }

      setPeriodClosed(true);
      alert("ปิดรอบบิลเรียบร้อยแล้ว!");
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Save Special Event / Deceased list
  const handleSaveFuneralEvents = async (updatedEvents: SpecialEventItem[]) => {
    if (!billingPeriodId) return;

    try {
      const res = await fetch("/api/billing/period", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: billingPeriodId, funeralEvents: updatedEvents }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกข้อมูลไม่สำเร็จ");

      setFuneralEvents(updatedEvents);
      setFuneralOccurrences(updatedEvents.length);

      const totalFuneralAmount = updatedEvents.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

      setBills(
        bills.map((bill) => {
          if (bill.status === "paid") return bill;

          const updatedItems = { ...bill.items };
          
          // Apply to any item of utility_type 'funeral'
          Object.keys(updatedItems).forEach((key) => {
            if (updatedItems[key].utility_type === "funeral") {
              updatedItems[key].amount = totalFuneralAmount;
            }
          });

          const itemsTotal = Object.values(updatedItems).reduce((sum, it) => sum + it.amount, 0);
          const total = itemsTotal + (bill.arrears_amount || 0);

          return {
            ...bill,
            items: updatedItems,
            total_amount: total,
            saved: false,
          };
        })
      );
      
      setIsFuneralModalOpen(false);
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    }
  };

  // Recalculate values when readings change
  const handleCurrentReadingChange = (houseId: string, utilityType: string, val: string) => {
    const numericVal = parseFloat(val) || 0;
    
    setBills(
      bills.map((bill) => {
        if (bill.house_id !== houseId) return bill;

        const item = bill.items[utilityType];
        if (!item || !item.is_metered) return bill;

        const prev = item.previous_reading || 0;
        const units = Math.max(0, numericVal - prev);

        const rateConfig = rates.find((r) => r.utility_type === utilityType);
        let amount = 0;
        if (rateConfig) {
          if (rateConfig.is_metered) {
            const tier = rateConfig.rate_tiers?.[0];
            const ratePerUnit = tier ? tier.rate : 10;
            amount = units * ratePerUnit;
          } else {
            amount = rateConfig.flat_rate ? Number(rateConfig.flat_rate) : 0;
          }
        } else {
          amount = units * 10;
        }

        const updatedItems = {
          ...bill.items,
          [utilityType]: {
            ...item,
            current_reading: val,
            units_used: units,
            amount: amount,
          }
        };

        const itemsTotal = Object.values(updatedItems).reduce((sum, it) => sum + it.amount, 0);
        const total = itemsTotal + (bill.arrears_amount || 0);

        return {
          ...bill,
          items: updatedItems,
          total_amount: total,
          saved: false,
        };
      })
    );
  };

  // Save single bill
  const handleSaveBill = async (houseId: string) => {
    if (!billingPeriodId) return;
    const bill = bills.find((b) => b.house_id === houseId);
    if (!bill) return;

    try {
      const itemsToInsert = Object.values(bill.items).map((item) => ({
        utility_type: item.utility_type,
        previous_reading: item.is_metered ? item.previous_reading : null,
        current_reading: item.is_metered && item.current_reading ? parseFloat(item.current_reading) : null,
        units_used: item.is_metered ? item.units_used : null,
        amount: item.amount,
      }));

      const res = await fetch("/api/billing/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: bill.id,
          billingPeriodId,
          houseId,
          totalAmount: bill.total_amount,
          arrearsAmount: bill.arrears_amount || 0,
          status: bill.status,
          items: itemsToInsert,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาดในการบันทึก");

      const savedBillId = data.billId;

      setBills(
        bills.map((b) =>
          b.house_id === houseId ? { ...b, id: savedBillId, saved: true } : b
        )
      );
    } catch (err: any) {
      alert("บันทึกไม่สำเร็จ: " + (err.message || "เกิดข้อผิดพลาด"));
    }
  };

  // Send Line notification
  const handleNotifyLine = async (houseId: string) => {
    const bill = bills.find((b) => b.house_id === houseId);
    if (!bill || !bill.id) {
      alert("กรุณาสร้างบิลของบ้านนี้ก่อนส่งแจ้งเตือน");
      return;
    }

    try {
      const res = await fetch("/api/line/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billId: bill.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาดในการส่งข้อความ");

      setBills(
        bills.map((b) =>
          b.house_id === houseId ? { ...b, notified: true } : b
        )
      );
      alert("ส่งแจ้งเตือน LINE เรียบร้อยแล้ว!");
    } catch (err: any) {
      alert("ไม่สามารถส่ง LINE ได้: " + err.message);
    }
  };

  // Statistics for period closing
  const totalBillsCount = bills.length;
  const savedBillsCount = bills.filter((b) => b.saved).length;
  const paidBillsCount = bills.filter((b) => b.status === "paid").length;
  const unpaidBillsCount = bills.filter((b) => b.status === "unpaid" || b.status === "pending_verify").length;
  const periodClosingEnabled = totalBillsCount > 0 && !periodClosed;

  return (
    <div className="space-y-6">
      {/* 1. Period & Billing Set Selection */}
      <div className="bg-white p-5 md:p-6 shadow-sm rounded-2xl border border-slate-100/85 space-y-5">
        <div className="flex justify-between items-center pb-3.5 border-b border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-display">ตัวเลือกการเรียกเก็บเงิน</span>
          <div>
            {periodClosed ? (
              <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-bold px-3 py-1 rounded-full">
                <span className="text-xs">🔒</span> ปิดรอบบิลแล้ว
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-3 py-1 rounded-full">
                <span className="text-xs">🔓</span> เปิดให้บันทึกข้อมูล
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1.5">รอบบิลเดือน</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all font-medium text-slate-800 cursor-pointer"
            >
              {MONTHS.map((m, idx) => (
                <option key={idx} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1.5">ปี พ.ศ.</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all font-medium text-slate-800 cursor-pointer"
            >
              {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>
                  {y + 543}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setTempSetName("");
                setTempSelectedRateIds([]);
                setIsSetConfigModalOpen(true);
              }}
              className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold py-2.5 px-4 rounded-xl cursor-pointer transition-all border border-slate-200"
            >
              ⚙️ ตั้งค่าชุดรายการ
            </button>
            {selectedItems.length > 0 && selectedItems.some((it) => it.utility_type === "funeral") && (
              <button
                type="button"
                disabled={!billingPeriodId}
                onClick={() => {
                  setTempFuneralEvents([...funeralEvents]);
                  setIsFuneralModalOpen(true);
                }}
                className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold py-2.5 px-4 rounded-xl cursor-pointer transition-all"
              >
                📋 จัดการสนับสนุนพิเศษ ({funeralOccurrences} รายการ)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Bills Setup Screen or dynamic list */}
      {loading ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 text-slate-400 text-sm">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          กำลังโหลดข้อมูลรอบบิล...
        </div>
      ) : selectedItems.length === 0 ? (
        /* Setup Screen: Select Billing Set */
        <div className="bg-white p-8 shadow-sm rounded-2xl border border-slate-100/85 text-center max-w-xl mx-auto space-y-6 my-8">
          <span className="text-4xl block">📋</span>
          <div className="space-y-2">
            <h3 className="text-base font-bold text-slate-800 font-display">เปิดการสร้างบิลรอบประจำเดือน</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              กรุณาเลือก "ชุดรายการเก็บเงิน" ที่ต้องการเรียกเก็บประจำรอบเดือนนี้ ระบบจะประมวลผลบิลสำหรับชาวบ้านโดยอิงตามชุดรายการที่เลือก
            </p>
          </div>

          <div className="space-y-4 max-w-xs mx-auto">
            <div className="text-left">
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5">เลือกชุดรายการเรียกเก็บ</label>
              <select
                value={selectedSetId}
                onChange={(e) => setSelectedSetId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary font-medium text-slate-800 cursor-pointer"
              >
                <option value="">-- กรุณาเลือกชุดเก็บเงิน --</option>
                {billingSets.map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.name} ({set.items.length} รายการ)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                disabled={!selectedSetId}
                onClick={handleApplyBillingSet}
                className="w-full py-2.5 bg-primary hover:bg-primary-light disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
              >
                🚀 เปิดรอบบิลและสร้างบิล
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Main Bills List and closing control panel */
        <div className="space-y-6">
          {/* Closing and summary control panel */}
          <div className="bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-200/60 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
            <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
              <div>🏠 บ้านทั้งหมด: <span className="text-slate-800 font-bold font-mono">{totalBillsCount}</span> หลัง</div>
              <div>✓ สร้างบิลแล้ว: <span className="text-emerald-600 font-bold font-mono">{savedBillsCount}</span> หลัง</div>
              <div>💰 ชำระเงินแล้ว: <span className="text-blue-600 font-bold font-mono">{paidBillsCount}</span> หลัง</div>
              <div>⏳ ค้างชำระ: <span className="text-amber-600 font-bold font-mono">{unpaidBillsCount}</span> หลัง</div>
            </div>

            {periodClosingEnabled && (
              <button
                type="button"
                onClick={handleClosePeriod}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 px-5 rounded-xl cursor-pointer transition-all shadow-xs flex items-center justify-center gap-1.5"
              >
                🔒 ปิดชุดรายการเก็บเงินรอบนี้
              </button>
            )}
          </div>

          {/* Bills Table for Desktop */}
          <div className="hidden md:block bg-white shadow rounded-xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
                    <th className="px-4 py-3">บ้านเลขที่</th>
                    <th className="px-4 py-3">ชื่อเจ้าของ</th>
                    {selectedItems.map((item) => (
                      <th key={item.utility_type} className="px-4 py-3 text-right">
                        {item.name} {item.is_metered && "(หน่วย)"}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right">ค้างเก่า</th>
                    <th className="px-4 py-3 text-right">ยอดรวมสุทธิ</th>
                    <th className="px-4 py-3 text-center">สถานะบิล</th>
                    <th className="px-4 py-3 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bills.map((bill) => (
                    <tr key={bill.house_id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-4 font-bold text-slate-800">{bill.house_number}</td>
                      <td className="px-4 py-4 text-slate-600 truncate max-w-[120px]">
                        <div>{bill.owner_name}</div>
                        {bill.arrears_amount > 0 && (
                          <span className="text-[9px] text-amber-600 font-bold">ค้าง {bill.unpaid_months} เดือน</span>
                        )}
                      </td>
                      {selectedItems.map((item) => {
                        const billItem = bill.items[item.utility_type];
                        return (
                          <td key={item.utility_type} className="px-4 py-4 text-right">
                            {item.is_metered ? (
                              <div className="inline-flex items-center gap-1">
                                <span className="text-[10px] text-slate-400 font-mono">({billItem?.previous_reading})</span>
                                <input
                                  type="number"
                                  min={billItem?.previous_reading}
                                  step="0.01"
                                  value={billItem?.current_reading || ""}
                                  disabled={periodClosed}
                                  onChange={(e) => handleCurrentReadingChange(bill.house_id, item.utility_type, e.target.value)}
                                  placeholder="คีย์เลข"
                                  className="w-16 px-1.5 py-0.5 border border-slate-200 rounded-md text-xs font-mono text-slate-800 text-right focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                                <span className="font-bold font-mono text-slate-600">➔ {billItem?.amount.toFixed(2)} บ.</span>
                              </div>
                            ) : (
                              <span className="font-bold text-slate-600 font-mono">{billItem?.amount.toFixed(2)} บ.</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-4 text-right">
                        {bill.arrears_amount > 0 ? (
                          <span className="text-amber-600 font-bold font-mono bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">
                            +{bill.arrears_amount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-emerald-600 font-mono text-sm">
                        {bill.total_amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {bill.saved ? (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 py-0.5 px-2 rounded-full">
                            สร้างบิลแล้ว
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 py-0.5 px-2 rounded-full animate-pulse">
                            ยังไม่สร้างบิล
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleSaveBill(bill.house_id)}
                          disabled={bill.saved || periodClosed}
                          className="text-primary hover:text-primary-light disabled:opacity-30 font-semibold cursor-pointer"
                        >
                          สร้างบิล
                        </button>
                        <button
                          onClick={() => handleNotifyLine(bill.house_id)}
                          disabled={!bill.saved}
                          className={`font-semibold cursor-pointer ${
                            bill.notified
                              ? "text-emerald-500 hover:text-emerald-700"
                              : "text-[#06C755] hover:text-[#05b34c]"
                          }`}
                        >
                          {bill.notified ? "ส่งซ้ำ" : "ส่ง LINE"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bills List for Mobile (Card View) */}
          <div className="md:hidden divide-y divide-slate-100 bg-white shadow rounded-xl border border-slate-100 overflow-hidden mb-12">
            {bills.map((bill) => (
              <div key={bill.house_id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-base font-bold text-slate-800">บ้านเลขที่ {bill.house_number}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">เจ้าของ: {bill.owner_name}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveBill(bill.house_id)}
                      disabled={bill.saved || periodClosed}
                      className="text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-30"
                    >
                      สร้างบิล
                    </button>
                    <button
                      onClick={() => handleNotifyLine(bill.house_id)}
                      disabled={!bill.saved}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-30 ${
                        bill.notified
                          ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                          : "text-white bg-[#06C755] hover:bg-[#05b34c]"
                      }`}
                    >
                      {bill.notified ? "ส่งซ้ำ" : "ส่ง LINE"}
                    </button>
                  </div>
                </div>

                {/* Arrears Banner if any */}
                {bill.arrears_amount > 0 && (
                  <div className="text-[11px] font-semibold text-amber-800 bg-amber-50/80 border border-amber-200/70 p-2.5 rounded-xl flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      <span>⚠️</span>
                      <span>ค้างชำระเดิม ({bill.unpaid_months || 1} รอบ):</span>
                    </span>
                    <span className="font-bold font-mono text-amber-700">+{bill.arrears_amount.toFixed(2)} บ.</span>
                  </div>
                )}

                {/* Meter Readings / Inputs */}
                {selectedItems.some((it) => it.is_metered) && (
                  <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {selectedItems.filter((it) => it.is_metered).map((item) => {
                      const billItem = bill.items[item.utility_type];
                      return (
                        <div key={item.utility_type} className="grid grid-cols-3 gap-1 items-center text-center">
                          <div>
                            <span className="block text-[9px] text-slate-400 font-semibold truncate">{item.name} (ก่อน)</span>
                            <span className="text-xs font-mono font-bold text-slate-500">{billItem?.previous_reading}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-slate-400 font-semibold truncate">{item.name} (คีย์)</span>
                            <input
                              type="number"
                              min={billItem?.previous_reading}
                              step="0.01"
                              value={billItem?.current_reading || ""}
                              disabled={periodClosed}
                              onChange={(e) => handleCurrentReadingChange(bill.house_id, item.utility_type, e.target.value)}
                              placeholder="คีย์เลข"
                              className="w-full text-center px-1 py-0.5 border border-slate-200 rounded-md text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                            />
                          </div>
                          <div>
                            <span className="block text-[9px] text-slate-400 font-semibold truncate">ยอดเงิน</span>
                            <span className="text-xs font-mono font-bold text-slate-700">{billItem?.amount.toFixed(2)} บ.</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Amounts Breakdown */}
                <div className="flex justify-between items-center text-xs pt-1">
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-slate-500">
                    {selectedItems.map((item) => (
                      <span key={item.utility_type}>
                        {item.name}: <strong className="text-slate-700 font-mono">{(bill.items[item.utility_type]?.amount || 0).toFixed(2)}</strong>
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {bill.saved ? (
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        สร้างบิลแล้ว
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full animate-pulse">
                        ยังไม่สร้างบิล
                      </span>
                    )}
                    <span className="text-sm font-bold text-emerald-600 font-mono">
                      {bill.total_amount.toFixed(2)} บ.
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Setup Billing Sets Modal */}
      {isSetConfigModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-sm text-slate-800 font-display">
                ⚙️ ตั้งค่าชุดรายการเก็บเงิน
              </h3>
              <button
                onClick={() => setIsSetConfigModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveBillingSet} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ชื่อชุดรายการเก็บเงิน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={tempSetName}
                  onChange={(e) => setTempSetName(e.target.value)}
                  placeholder="เช่น เก็บค่าบริการปกติประจำเดือน, เก็บเงินพิเศษงานวัด"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  เลือกรายการที่จะรวมอยู่ในชุดนี้ <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-100">
                  {rates.map((rate) => {
                    const isChecked = tempSelectedRateIds.includes(rate.id);
                    return (
                      <label key={rate.id} className="flex items-center text-xs text-slate-700 cursor-pointer p-1.5 hover:bg-white rounded transition-colors">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTempSelectedRateIds([...tempSelectedRateIds, rate.id]);
                            } else {
                              setTempSelectedRateIds(tempSelectedRateIds.filter((id) => id !== rate.id));
                            }
                          }}
                          className="mr-2 text-primary focus:ring-primary rounded"
                        />
                        <div className="flex flex-col">
                          <span className="font-semibold">{rate.name}</span>
                          <span className="text-[10px] text-slate-400">
                            {rate.is_metered ? "คิดตามมิเตอร์" : `เหมาจ่าย ${rate.flat_rate} บาท`}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-1.5 text-right">
                  <a
                    href="/admin/settings/rates"
                    className="text-[10px] text-primary hover:underline font-bold"
                  >
                    ➕ ไปที่หน้าตั้งค่าอัตราเพื่อสร้างรายการเก็บเงินใหม่
                  </a>
                </div>
              </div>

              <div className="pt-4 flex gap-3 justify-end border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSetConfigModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingSet}
                  className="px-4 py-2 bg-primary hover:bg-primary-light text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {savingSet ? "กำลังบันทึก..." : "บันทึกชุดรายการ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Special Event / Funeral Modal */}
      {isFuneralModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 font-display text-sm">
                📋 จัดการรายการเรียกเก็บเงินพิเศษประจำรอบบิล
              </h3>
              <button
                type="button"
                onClick={() => setIsFuneralModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <p className="text-xs text-slate-500">
                เพิ่มรายการเรียกเก็บเงินพิเศษ (เช่น ฌาปนกิจ, ค่าซ่อมประปาหมู่บ้าน, ส่วนกลาง) ประจำรอบบิลนี้ ระบบจะบวกยอดรวมในบิลของทุกบ้านอัตโนมัติ
              </p>

              {tempFuneralEvents.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl text-slate-400 text-sm">
                  ไม่มีรายการเรียกเก็บพิเศษในรอบบิลนี้
                </div>
              ) : (
                <div className="space-y-4">
                  {tempFuneralEvents.map((item, index) => (
                    <div key={item.id || index} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-3 relative">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400">รายการที่ {index + 1}</span>
                        {!periodClosed && (
                          <button
                            type="button"
                            onClick={() => {
                              setTempFuneralEvents(tempFuneralEvents.filter((_, i) => i !== index));
                            }}
                            className="text-red-500 hover:text-red-700 text-xs font-bold cursor-pointer"
                          >
                            ลบออก ×
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">ประเภทค่าเก็บเงิน</label>
                          <select
                            value={item.type || "funeral"}
                            disabled={periodClosed}
                            onChange={(e) => {
                              const updated = [...tempFuneralEvents];
                              const newType = e.target.value;
                              updated[index].type = newType;
                              if (newType === "maintenance") {
                                updated[index].name = "ค่าซ่อมบำรุงท่อประปา";
                              } else if (newType === "common") {
                                updated[index].name = "ค่าบำรุงส่วนกลาง";
                              } else if (newType === "other") {
                                updated[index].name = "ค่าใช้จ่ายพิเศษ";
                              } else {
                                updated[index].name = "";
                              }
                              setTempFuneralEvents(updated);
                            }}
                            className="w-full px-2.5 py-1.5 border border-slate-250 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="funeral">เงินฌาปนกิจ</option>
                            <option value="maintenance">ค่าซ่อมประปา</option>
                            <option value="common">ค่าส่วนกลาง</option>
                            <option value="other">อื่นๆ</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">จำนวนเก็บต่อบ้าน</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              placeholder="เช่น 20"
                              value={item.amount}
                              disabled={periodClosed}
                              onChange={(e) => {
                                const updated = [...tempFuneralEvents];
                                updated[index].amount = parseFloat(e.target.value) || 0;
                                setTempFuneralEvents(updated);
                              }}
                              className="w-full px-2.5 py-1.5 border border-slate-250 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary text-right font-mono"
                            />
                            <span className="text-xs text-slate-400">บาท</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          {(item.type || "funeral") === "funeral" ? "ชื่อผู้เสียชีวิต" : "รายละเอียดเพิ่มเติม"}
                        </label>
                        <input
                          type="text"
                          placeholder={
                            (item.type || "funeral") === "funeral" 
                              ? "ชื่อ-นามสกุลผู้เสียชีวิต" 
                              : "เช่น ซ่อมท่อเมนประปาซอย 3"
                          }
                          value={item.name}
                          disabled={periodClosed}
                          onChange={(e) => {
                            const updated = [...tempFuneralEvents];
                            updated[index].name = e.target.value;
                            setTempFuneralEvents(updated);
                          }}
                          className="w-full px-3 py-1.5 border border-slate-250 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!periodClosed && (
                <button
                  type="button"
                  onClick={() => {
                    const funeralRate = rates.find((r) => r.utility_type === "funeral");
                    const defaultRate = funeralRate?.flat_rate ? Number(funeralRate.flat_rate) : 20;
                    setTempFuneralEvents([
                      ...tempFuneralEvents,
                      {
                        id: Math.random().toString(36).substring(7),
                        type: "funeral",
                        name: "",
                        amount: defaultRate,
                      },
                    ]);
                  }}
                  className="w-full py-2.5 border-2 border-dashed border-emerald-500 hover:bg-emerald-50/50 text-emerald-600 text-xs font-semibold rounded-xl text-center cursor-pointer transition-colors"
                >
                  ➕ เพิ่มรายการเก็บเงินพิเศษ
                </button>
              )}
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center">
              <div>
                <span className="text-xs text-slate-500">ยอดรวมจัดเก็บ:</span>
                <p className="text-lg font-bold text-emerald-600 font-mono">
                  {tempFuneralEvents.reduce((sum, item) => sum + (Number(item.amount) || 0), 0).toFixed(2)} บาท
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsFuneralModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  ปิด
                </button>
                {!periodClosed && (
                  <button
                    type="button"
                    onClick={() => handleSaveFuneralEvents(tempFuneralEvents)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                  >
                    บันทึกรายการ
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
