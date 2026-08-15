"use client";

import React, { useState } from "react";

interface HouseMember {
  id: string;
  display_name: string | null;
  picture_url: string | null;
  line_user_id: string;
}

interface House {
  id: string;
  house_number: string;
  owner_name: string | null;
  water_meter_id: string | null;
  house_members?: HouseMember[];
}

interface HouseManagementProps {
  initialHouses: House[];
  communityId: string;
}

export default function HouseManagement({
  initialHouses,
  communityId,
}: HouseManagementProps) {
  const [houses, setHouses] = useState<House[]>(initialHouses);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  
  // Form states
  const [houseNumber, setHouseNumber] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [waterMeterId, setWaterMeterId] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingHouse(null);
    setHouseNumber("");
    setOwnerName("");
    setWaterMeterId("");
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (house: House) => {
    setEditingHouse(house);
    setHouseNumber(house.house_number);
    setOwnerName(house.owner_name || "");
    setWaterMeterId(house.water_meter_id || "");
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (editingHouse) {
        // Update House via custom API
        const res = await fetch("/api/houses", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingHouse.id,
            houseNumber,
            ownerName,
            waterMeterId,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "ไม่สามารถอัปเดตข้อมูลได้");

        setHouses(
          houses.map((h) =>
            h.id === editingHouse.id
              ? {
                  ...h,
                  house_number: houseNumber,
                  owner_name: ownerName,
                  water_meter_id: waterMeterId,
                }
              : h
          )
        );
      } else {
        // Add House via custom API
        const res = await fetch("/api/houses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            communityId,
            houseNumber,
            ownerName,
            waterMeterId,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "ไม่สามารถเพิ่มข้อมูลได้");

        setHouses([...houses, { ...data.data, house_members: [] }].sort((a, b) => a.house_number.localeCompare(b.house_number)));
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบบ้านเลขที่นี้? ข้อมูลการเรียกเก็บเงินและสมาชิกจะถูกลบออกทั้งหมด")) return;

    try {
      const res = await fetch(`/api/houses?id=${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ไม่สามารถลบข้อมูลได้");

      setHouses(houses.filter((h) => h.id !== id));
    } catch (err: any) {
      alert("ลบข้อมูลไม่สำเร็จ: " + (err.message || "เกิดข้อผิดพลาด"));
    }
  };

  const filteredHouses = houses.filter(
    (h) =>
      h.house_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (h.owner_name && h.owner_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-white shadow rounded-xl border border-slate-100 overflow-hidden">
      {/* Table Actions Header */}
      <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">🔍</span>
          <input
            type="text"
            placeholder="ค้นหาด้วยบ้านเลขที่ หรือชื่อเจ้าของบ้าน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
          />
        </div>
        <button
          onClick={openAddModal}
          className="bg-primary hover:bg-primary-light text-white text-sm font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          ➕ เพิ่มบ้านเลขที่
        </button>
      </div>

      {/* Houses Table for Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
              <th className="px-6 py-3">บ้านเลขที่</th>
              <th className="px-6 py-3">ชื่อเจ้าของบ้าน</th>
              <th className="px-6 py-3 w-48">เลขมิเตอร์น้ำ</th>
              <th className="px-6 py-3">สถานะเชื่อมต่อ LINE</th>
              <th className="px-6 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredHouses.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                  ไม่พบข้อมูลบ้านเลขที่
                </td>
              </tr>
            ) : (
              filteredHouses.map((house) => {
                const memberCount = house.house_members?.length || 0;
                return (
                  <tr key={house.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-bold text-slate-800">{house.house_number}</td>
                    <td className="px-6 py-4 text-slate-700">{house.owner_name || "-"}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono">{house.water_meter_id || "-"}</td>
                    <td className="px-6 py-4">
                      {memberCount > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {house.house_members?.map((m) => (
                              <img
                                key={m.id}
                                src={m.picture_url || "/avatar.png"}
                                alt={m.display_name || "member"}
                                className="w-7 h-7 rounded-full border-2 border-white object-cover"
                                title={m.display_name || "LINE User"}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 py-0.5 px-2 rounded-full">
                            เชื่อมต่อ LINE ({memberCount} คน)
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400 bg-slate-50 py-0.5 px-2 rounded-full">
                          ยังไม่เชื่อมต่อ
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(house)}
                        className="text-primary hover:text-primary-light font-medium cursor-pointer"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => handleDelete(house.id)}
                        className="text-red-500 hover:text-red-700 font-medium cursor-pointer"
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Houses List for Mobile (Card View) */}
      <div className="md:hidden divide-y divide-slate-100 bg-white">
        {filteredHouses.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            ไม่พบข้อมูลบ้านเลขที่
          </div>
        ) : (
          filteredHouses.map((house) => {
            const memberCount = house.house_members?.length || 0;
            return (
              <div key={house.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-base font-bold text-slate-800">บ้านเลขที่ {house.house_number}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">เจ้าของ: {house.owner_name || "-"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(house)}
                      className="text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => handleDelete(house.id)}
                      className="text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      ลบ
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
                  <div>
                    <span className="font-semibold text-slate-400">มิเตอร์น้ำ:</span>{" "}
                    <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{house.water_meter_id || "-"}</span>
                  </div>
                  <div>
                    {memberCount > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-1.5">
                          {house.house_members?.slice(0, 3).map((m) => (
                            <img
                              key={m.id}
                              src={m.picture_url || "/avatar.png"}
                              alt={m.display_name || "member"}
                              className="w-5 h-5 rounded-full border border-white object-cover"
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                          LINE ({memberCount})
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full">
                        ยังไม่ผูก LINE
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800 font-display">
                {editingHouse ? "แก้ไขข้อมูลบ้าน" : "เพิ่มบ้านเลขที่ใหม่"}
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  บ้านเลขที่ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  placeholder="เช่น 12/3"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ชื่อเจ้าของบ้าน
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="เช่น นายแสนสุข มีความรู้"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  เลขมิเตอร์น้ำ (ถ้าระบบคิดค่าน้ำตามมิเตอร์)
                </label>
                <input
                  type="text"
                  value={waterMeterId}
                  onChange={(e) => setWaterMeterId(e.target.value)}
                  placeholder="เช่น M-00123"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="pt-4 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-primary hover:bg-primary-light text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50"
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
