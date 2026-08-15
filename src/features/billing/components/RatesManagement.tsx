"use client";

import React, { useState } from "react";

interface UtilityRate {
  id?: string;
  community_id: string;
  utility_type: string;
  name: string;
  is_metered: boolean;
  flat_rate: number | null;
  rate_tiers: any;
}

interface RatesManagementProps {
  initialRates: UtilityRate[];
  communityId: string;
}

export default function RatesManagement({
  initialRates,
  communityId,
}: RatesManagementProps) {
  const [rates, setRates] = useState<UtilityRate[]>(initialRates);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<UtilityRate | null>(null);
  
  // Form states
  const [name, setName] = useState("");
  const [isMetered, setIsMetered] = useState(false);
  const [flatRate, setFlatRate] = useState<string>("");
  const [unitRate, setUnitRate] = useState<string>("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingRate(null);
    setName("");
    setIsMetered(false);
    setFlatRate("");
    setUnitRate("");
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (rate: UtilityRate) => {
    setEditingRate(rate);
    setName(rate.name);
    setIsMetered(rate.is_metered);
    if (rate.is_metered) {
      setUnitRate(String(rate.rate_tiers?.[0]?.rate || ""));
      setFlatRate("");
    } else {
      setFlatRate(String(rate.flat_rate || ""));
      setUnitRate("");
    }
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const utilityType = editingRate?.utility_type || "rate_" + Math.random().toString(36).substring(7);
    const finalFlatRate = isMetered ? null : parseFloat(flatRate) || 0;
    const finalRateTiers = isMetered ? [{ min: 0, max: 99999, rate: parseFloat(unitRate) || 0 }] : null;

    try {
      const res = await fetch("/api/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingRate?.id,
          communityId,
          utilityType,
          name,
          isMetered,
          flatRate: finalFlatRate,
          rateTiers: finalRateTiers,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");

      const savedRate = data.data;

      if (editingRate) {
        setRates(rates.map((r) => (r.id === editingRate.id ? savedRate : r)));
      } else {
        setRates([savedRate, ...rates]);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรายการเรียกเก็บเงินนี้?")) return;

    try {
      const res = await fetch(`/api/rates?id=${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ไม่สามารถลบข้อมูลได้");

      setRates(rates.filter((r) => r.id !== id));
    } catch (err: any) {
      alert("ลบข้อมูลไม่สำเร็จ: " + (err.message || "เกิดข้อผิดพลาด"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Table Actions Header */}
      <div className="flex justify-between items-center bg-white p-4 md:p-6 shadow-sm rounded-xl border border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-800 font-display">รายการเรียกเก็บเงินทั้งหมด</h2>
          <p className="text-xs text-slate-400 mt-1">จัดการบริการประปา สาธารณูปโภค หรือเงินสงเคราะห์ต่าง ๆ ที่ต้องการจัดเก็บ</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-primary hover:bg-primary-light text-white text-xs font-semibold py-2 px-4 rounded-lg flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
        >
          ➕ เพิ่มรายการเรียกเก็บ
        </button>
      </div>

      {/* Rates Table / List */}
      <div className="bg-white shadow-sm rounded-xl border border-slate-100 overflow-hidden">
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
                <th className="px-6 py-4">ชื่อรายการเรียกเก็บ</th>
                <th className="px-6 py-4">รูปแบบการคิดเงิน</th>
                <th className="px-6 py-4 w-48 text-right">อัตราเรียกเก็บ</th>
                <th className="px-6 py-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {rates.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                    ยังไม่มีรายการเรียกเก็บเงินในระบบ
                  </td>
                </tr>
              ) : (
                rates.map((rate) => (
                  <tr key={rate.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-bold text-slate-800">{rate.name}</td>
                    <td className="px-6 py-4 text-xs font-medium">
                      {rate.is_metered ? (
                        <span className="text-sky-600 bg-sky-50 py-0.5 px-2 rounded-full">💧 คิดตามหน่วยมิเตอร์</span>
                      ) : (
                        <span className="text-emerald-600 bg-emerald-50 py-0.5 px-2 rounded-full">💵 เหมาจ่ายรายหลังคาเรือน</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-800">
                      {rate.is_metered ? (
                        <span>{rate.rate_tiers?.[0]?.rate || 0} บาท / หน่วย</span>
                      ) : (
                        <span>{rate.flat_rate || 0} บาท</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button
                        onClick={() => openEditModal(rate)}
                        className="text-primary hover:text-primary-light font-medium cursor-pointer"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => rate.id && handleDelete(rate.id)}
                        className="text-red-500 hover:text-red-700 font-medium cursor-pointer"
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-100 bg-white">
          {rates.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              ยังไม่มีรายการเรียกเก็บเงินในระบบ
            </div>
          ) : (
            rates.map((rate) => (
              <div key={rate.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-base font-bold text-slate-800">{rate.name}</h4>
                    <div className="mt-1">
                      {rate.is_metered ? (
                        <span className="text-[10px] font-medium text-sky-600 bg-sky-50 py-0.5 px-2 rounded-full">💧 คิดตามหน่วยมิเตอร์</span>
                      ) : (
                        <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 py-0.5 px-2 rounded-full">💵 เหมาจ่าย</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(rate)}
                      className="text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => rate.id && handleDelete(rate.id)}
                      className="text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                    >
                      ลบ
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-500 pt-1 border-t border-slate-50">
                  <span className="text-slate-400 font-medium">อัตราค่าบริการ:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {rate.is_metered ? (
                      <span>{rate.rate_tiers?.[0]?.rate || 0} บ. / หน่วย</span>
                    ) : (
                      <span>{rate.flat_rate || 0} บ.</span>
                    )}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-sm text-slate-800 font-display">
                {editingRate ? "⚙️ แก้ไขรายการเรียกเก็บเงิน" : "➕ เพิ่มรายการเรียกเก็บเงินใหม่"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-xs text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ชื่อรายการค่าบริการ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น ค่าบำรุงไฟฟ้าสาธารณะ, เงินสงเคราะห์งานศพ"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  รูปแบบการคำนวณเงิน <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="calculation_type"
                      checked={!isMetered}
                      onChange={() => setIsMetered(false)}
                      className="mr-2 text-primary focus:ring-primary"
                    />
                    เหมาจ่ายรายรอบ / รายครั้ง
                  </label>
                  <label className="inline-flex items-center text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="calculation_type"
                      checked={isMetered}
                      onChange={() => setIsMetered(true)}
                      className="mr-2 text-primary focus:ring-primary"
                    />
                    คิดตามมิเตอร์น้ำ (หน่วย)
                  </label>
                </div>
              </div>

              {isMetered ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ค่าน้ำต่อหน่วย (บาท / หน่วย) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.1"
                    value={unitRate}
                    onChange={(e) => setUnitRate(e.target.value)}
                    placeholder="เช่น 10.50"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white bg-slate-50 font-mono"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    จำนวนเงินคงที่ (บาท) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={flatRate}
                    onChange={(e) => setFlatRate(e.target.value)}
                    placeholder="เช่น 50"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white bg-slate-50 font-mono"
                  />
                </div>
              )}

              <div className="pt-4 flex gap-3 justify-end border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-primary hover:bg-primary-light text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {loading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
