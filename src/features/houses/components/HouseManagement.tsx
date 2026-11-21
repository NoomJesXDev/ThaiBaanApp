"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";

interface ImportPreviewRow {
  houseNumber: string;
  ownerName: string;
  waterMeterId: string;
  isExisting: boolean;
}

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

  // Bulk Import states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportPreviewRow[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [duplicateMode, setDuplicateMode] = useState<"skip" | "update">("skip");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<{
    inserted: number;
    updated: number;
    skipped: number;
    total: number;
  } | null>(null);

  const openImportModal = () => {
    setImportRows([]);
    setImportFileName("");
    setDuplicateMode("skip");
    setImportError(null);
    setImportSummary(null);
    setIsImportModalOpen(true);
  };

  const handleDownloadTemplate = () => {
    const sampleData = [
      { บ้านเลขที่: "1/1", ชื่อเจ้าของบ้าน: "นายสมชาย ใจดี", เลขมิเตอร์น้ำ: "M-001" },
      { บ้านเลขที่: "1/2", ชื่อเจ้าของบ้าน: "นางสมศรี มีสุข", เลขมิเตอร์น้ำ: "M-002" },
      { บ้านเลขที่: "1/3", ชื่อเจ้าของบ้าน: "นายมานะ รักเรียน", เลขมิเตอร์น้ำ: "M-003" },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws["!cols"] = [{ wch: 16 }, { wch: 28 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายชื่อลูกบ้าน");
    XLSX.writeFile(wb, "template-houses-communex.xlsx");
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSummary(null);
    setImportFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error("ไม่พบชีทข้อมูลในไฟล์");
      }

      const sheet = workbook.Sheets[firstSheetName];
      const rawMatrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: "",
      });

      if (rawMatrix.length === 0) {
        throw new Error("ไฟล์ไม่มีข้อมูล");
      }

      // Detect header row
      const firstRow = (rawMatrix[0] || []).map((cell) => String(cell || "").trim().toLowerCase());
      const findColIndex = (keywords: string[]) =>
        firstRow.findIndex((h) => keywords.some((k) => h.includes(k)));

      const houseCol = findColIndex(["บ้านเลขที่", "เลขที่บ้าน", "house_number", "house"]);
      const ownerCol = findColIndex(["เจ้าของ", "ชื่อ", "owner_name", "owner", "name"]);
      const meterCol = findColIndex(["มิเตอร์", "meter", "water_meter"]);

      const hasHeader = houseCol !== -1 || ownerCol !== -1 || meterCol !== -1;
      const startIdx = hasHeader ? 1 : 0;
      const hIdx = houseCol !== -1 ? houseCol : 0;
      const oIdx = ownerCol !== -1 ? ownerCol : 1;
      const mIdx = meterCol !== -1 ? meterCol : 2;

      const existingSet = new Set(houses.map((h) => h.house_number.trim().toLowerCase()));
      const parsed: ImportPreviewRow[] = [];

      for (let i = startIdx; i < rawMatrix.length; i++) {
        const row = rawMatrix[i] || [];
        const hNum = String(row[hIdx] ?? "").trim();
        if (!hNum) continue;

        parsed.push({
          houseNumber: hNum,
          ownerName: String(row[oIdx] ?? "").trim(),
          waterMeterId: String(row[mIdx] ?? "").trim(),
          isExisting: existingSet.has(hNum.toLowerCase()),
        });
      }

      if (parsed.length === 0) {
        throw new Error("ไม่พบแถวข้อมูลที่มีบ้านเลขที่ กรุณาตรวจสอบรูปแบบไฟล์");
      }

      setImportRows(parsed);
    } catch (err: unknown) {
      setImportRows([]);
      setImportError(err instanceof Error ? err.message : "ไม่สามารถอ่านไฟล์ได้ กรุณาใช้ไฟล์ .xlsx หรือ .csv");
    }
  };

  const handleConfirmImport = async () => {
    if (importRows.length === 0) return;
    setImporting(true);
    setImportError(null);

    try {
      const res = await fetch("/api/houses/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          houses: importRows.map((r) => ({
            houseNumber: r.houseNumber,
            ownerName: r.ownerName || null,
            waterMeterId: r.waterMeterId || null,
          })),
          duplicateMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "นำเข้าข้อมูลไม่สำเร็จ");

      setImportSummary(data.summary);

      // Update local houses list immediately
      setHouses((prev) => {
        const updatedMap = new Map<string, House>();
        prev.forEach((h) => updatedMap.set(h.id, h));

        (data.updatedRows || []).forEach((row: House) => {
          const existing = updatedMap.get(row.id);
          updatedMap.set(row.id, {
            ...row,
            house_members: existing?.house_members || [],
          });
        });

        (data.insertedRows || []).forEach((row: House) => {
          updatedMap.set(row.id, {
            ...row,
            house_members: [],
          });
        });

        return Array.from(updatedMap.values()).sort((a, b) =>
          a.house_number.localeCompare(b.house_number, "th", { numeric: true })
        );
      });
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการนำเข้าข้อมูล");
    } finally {
      setImporting(false);
    }
  };

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
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : undefined) || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
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
    } catch (err: unknown) {
      alert("ลบข้อมูลไม่สำเร็จ: " + ((err instanceof Error ? err.message : undefined) || "เกิดข้อผิดพลาด"));
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
        <div className="flex flex-wrap gap-2">
          <button
            onClick={openImportModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            📥 นำเข้าไฟล์ (Excel / CSV)
          </button>
          <button
            onClick={openAddModal}
            className="bg-primary hover:bg-primary-light text-white text-sm font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            ➕ เพิ่มบ้านเลขที่
          </button>
        </div>
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

      {/* Bulk Import Modal (Excel / CSV) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-slate-800 font-display">
                  📥 นำเข้าข้อมูลลูกบ้านจากไฟล์ (Excel / CSV)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  รองรับไฟล์ .xlsx, .xls และ .csv (คอลัมน์: บ้านเลขที่, ชื่อเจ้าของบ้าน, เลขมิเตอร์น้ำ)
                </p>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {importError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-xs text-red-700">
                  {importError}
                </div>
              )}

              {importSummary ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center space-y-3">
                  <div className="text-3xl">🎉</div>
                  <h4 className="font-bold text-emerald-800 text-base">นำเข้าข้อมูลลูกบ้านสำเร็จ!</h4>
                  <div className="flex justify-center gap-4 text-xs font-medium">
                    <span className="bg-white px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700">
                      เพิ่มใหม่: <strong>{importSummary.inserted}</strong> หลัง
                    </span>
                    <span className="bg-white px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700">
                      อัปเดต: <strong>{importSummary.updated}</strong> หลัง
                    </span>
                    <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600">
                      ข้าม: <strong>{importSummary.skipped}</strong> หลัง
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Step 1: Download Template & Upload File */}
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                    <div className="text-xs text-slate-600 space-y-1">
                      <p className="font-semibold text-slate-800">1. เตรียมไฟล์รายชื่อลูกบ้าน</p>
                      <p>ใช้ไฟล์ Excel เดิมของคุณ หรือดาวน์โหลดไฟล์ตัวอย่างไปกรอกได้เลย</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
                    >
                      📄 ดาวน์โหลดไฟล์ตัวอย่าง (.xlsx)
                    </button>
                  </div>

                  {/* Step 2: File Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      2. เลือกไฟล์ Excel หรือ CSV จากเครื่อง
                    </label>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleImportFileChange}
                      className="block w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 border border-slate-200 rounded-lg p-1.5 cursor-pointer"
                    />
                    {importFileName && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        ไฟล์ที่เลือก: <span className="font-medium text-slate-700">{importFileName}</span>
                      </p>
                    )}
                  </div>

                  {/* Step 3: Duplicate handling */}
                  {importRows.length > 0 && (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-blue-50/60 p-3 rounded-xl border border-blue-100">
                        <span className="text-xs font-semibold text-slate-700">
                          พบข้อมูลทั้งหมด <span className="text-primary">{importRows.length}</span> หลัง
                          {" "}
                          (ใหม่ {importRows.filter((r) => !r.isExisting).length} / ซ้ำ {importRows.filter((r) => r.isExisting).length})
                        </span>
                        <div className="flex items-center gap-3 text-xs">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="duplicateMode"
                              checked={duplicateMode === "skip"}
                              onChange={() => setDuplicateMode("skip")}
                            />
                            <span>ข้ามบ้านที่ซ้ำ</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="duplicateMode"
                              checked={duplicateMode === "update"}
                              onChange={() => setDuplicateMode("update")}
                            />
                            <span>อัปเดตบ้านที่ซ้ำ</span>
                          </label>
                        </div>
                      </div>

                      {/* Preview Table */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200">
                            <tr>
                              <th className="px-3 py-2">#</th>
                              <th className="px-3 py-2">บ้านเลขที่</th>
                              <th className="px-3 py-2">ชื่อเจ้าของบ้าน</th>
                              <th className="px-3 py-2">เลขมิเตอร์น้ำ</th>
                              <th className="px-3 py-2 text-right">สถานะ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {importRows.slice(0, 50).map((row, idx) => (
                              <tr key={`${row.houseNumber}-${idx}`} className="hover:bg-slate-50/50">
                                <td className="px-3 py-1.5 text-slate-400">{idx + 1}</td>
                                <td className="px-3 py-1.5 font-bold text-slate-800">{row.houseNumber}</td>
                                <td className="px-3 py-1.5 text-slate-700">{row.ownerName || "-"}</td>
                                <td className="px-3 py-1.5 font-mono text-slate-500">{row.waterMeterId || "-"}</td>
                                <td className="px-3 py-1.5 text-right">
                                  {row.isExisting ? (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                                      มีในระบบแล้ว
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                                      ใหม่
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {importRows.length > 50 && (
                          <div className="text-center py-2 text-[11px] text-slate-400 bg-slate-50 border-t border-slate-100">
                            แสดงตัวอย่าง 50 รายการแรก จากทั้งหมด {importRows.length} รายการ
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 border border-slate-200 bg-white rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                {importSummary ? "ปิดหน้าต่าง" : "ยกเลิก"}
              </button>
              {!importSummary && (
                <button
                  type="button"
                  disabled={importing || importRows.length === 0}
                  onClick={handleConfirmImport}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50"
                >
                  {importing
                    ? "กำลังนำเข้าข้อมูล..."
                    : `ยืนยันนำเข้า ${importRows.length} หลัง`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
