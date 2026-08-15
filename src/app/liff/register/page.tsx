"use client";

import React, { useState, useEffect } from "react";
import { useLiffContext } from "@/features/line/components/LiffProvider";

interface Community {
  id: string;
  name: string;
}

interface House {
  id: string;
  house_number: string;
  owner_name: string | null;
  community_id: string;
  communities: Community;
}

interface LinkedHouse {
  id: string;
  house_id: string;
  line_user_id: string;
  houses: House;
}

export default function LiffRegisterPage() {
  const { profile } = useLiffContext();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // DB States
  const [linkedHouse, setLinkedHouse] = useState<LinkedHouse | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  
  // Form States
  const [selectedCommunityId, setSelectedCommunityId] = useState("");
  const [houseNumberInput, setHouseNumberInput] = useState("");
  const [searchedHouse, setSearchedHouse] = useState<House | null>(null);
  const [ownerNameInput, setOwnerNameInput] = useState(""); // If house needs to be created
  const [registering, setRegistering] = useState(false);

  // Check if already registered
  const checkRegistration = async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/liff/profile?lineUserId=${profile.userId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาดในการโหลดข้อมูล");

      if (data.registered) {
        setLinkedHouse(data.data);
      } else {
        setLinkedHouse(null);
        setCommunities(data.communities || []);
        if (data.communities && data.communities.length > 0) {
          setSelectedCommunityId(data.communities[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการดึงข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkRegistration();
  }, [profile]);

  const handleSearchHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseNumberInput.trim()) return;

    setError(null);
    setSearchedHouse(null);
    setOwnerNameInput("");

    try {
      const res = await fetch(
        `/api/liff/search-house?communityId=${selectedCommunityId}&houseNumber=${encodeURIComponent(houseNumberInput.trim())}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาดในการค้นหา");

      if (data.found) {
        setSearchedHouse(data.data);
      } else {
        // House doesn't exist, we will allow creating it
        const selectedCommunityName = communities.find((c) => c.id === selectedCommunityId)?.name || "";
        setSearchedHouse({
          id: "NEW", // Special flag
          house_number: houseNumberInput.trim(),
          owner_name: "",
          community_id: selectedCommunityId,
          communities: {
            id: selectedCommunityId,
            name: selectedCommunityName
          },
        });
      }
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการตรวจสอบบ้านเลขที่");
    }
  };

  const handleConfirmRegister = async () => {
    if (!profile || !searchedHouse) return;

    setRegistering(true);
    setError(null);

    try {
      const res = await fetch("/api/liff/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineUserId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
          houseId: searchedHouse.id,
          communityId: searchedHouse.community_id,
          houseNumber: searchedHouse.house_number,
          ownerName: ownerNameInput,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "การลงทะเบียนล้มเหลว");

      setSuccess("ลงทะเบียนบ้านเลขที่สำเร็จ!");
      setTimeout(() => {
        setSuccess(null);
        checkRegistration();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "การลงทะเบียนล้มเหลว");
    } finally {
      setRegistering(false);
    }
  };

  const handleUnlink = async () => {
    if (!linkedHouse || !confirm("คุณต้องการยกเลิกการเชื่อมต่อบ้านเลขที่นี้ใช่หรือไม่? คุณจะไม่ได้รับการแจ้งเตือนค่าน้ำผ่าน LINE อีกต่อไป")) return;

    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/liff/register?memberId=${linkedHouse.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ไม่สามารถยกเลิกการผูกบัญชีได้");

      setLinkedHouse(null);
      setSearchedHouse(null);
      setHouseNumberInput("");
      checkRegistration();
    } catch (err: any) {
      setError(err.message || "ไม่สามารถยกเลิกการผูกบัญชีได้");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div>
        <h2 className="text-xl font-bold font-display text-slate-800">ข้อมูลบ้านของคุณ</h2>
        <p className="text-xs text-slate-500 mt-1">
          ผูกบ้านเลขที่กับไลน์เพื่อรับการแจ้งเตือนและชำระค่าบริการ
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-xs text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded text-xs text-green-700">
          {success}
        </div>
      )}

      {linkedHouse ? (
        /* Registered View */
        <div className="bg-white rounded-xl shadow border border-slate-100 p-6 space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
              ผูกบัญชีสำเร็จ
            </span>
            <h3 className="text-2xl font-bold text-slate-800 font-display pt-2">
              บ้านเลขที่ {linkedHouse.houses?.house_number}
            </h3>
            <p className="text-sm font-medium text-slate-600">
              ชุมชน: {linkedHouse.houses?.communities?.name}
            </p>
            <p className="text-sm text-slate-500">
              ชื่อเจ้าของบ้าน: {linkedHouse.houses?.owner_name || "-"}
            </p>
          </div>

          <div className="border-t border-slate-100 pt-4 flex justify-end">
            <button
              onClick={handleUnlink}
              className="text-xs font-semibold text-red-500 hover:text-red-700 cursor-pointer"
            >
              🚪 ยกเลิกการผูกบ้านหลังนี้
            </button>
          </div>
        </div>
      ) : (
        /* Not Registered View — Search and Bind Form */
        <div className="bg-white rounded-xl shadow border border-slate-100 p-6 space-y-6">
          {!searchedHouse ? (
            <form onSubmit={handleSearchHouse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  เลือกชุมชน / หมู่บ้านของคุณ
                </label>
                <select
                  value={selectedCommunityId}
                  onChange={(e) => setSelectedCommunityId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {communities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ป้อนบ้านเลขที่ของคุณ
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น 99/9"
                  value={houseNumberInput}
                  onChange={(e) => setHouseNumberInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                🔎 ค้นหาข้อมูลบ้าน
              </button>
            </form>
          ) : (
            /* Confirmation View */
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2">
                <span className="text-xs font-semibold text-slate-400">ข้อมูลบ้านที่พบ</span>
                <h4 className="text-xl font-bold font-display text-slate-800">
                  บ้านเลขที่ {searchedHouse.house_number}
                </h4>
                <p className="text-sm text-slate-600">ชุมชน: {searchedHouse.communities?.name}</p>

                {searchedHouse.id === "NEW" ? (
                  /* New house registration */
                  <div className="pt-2">
                    <p className="text-xs text-amber-600 mb-2">
                      ⚠️ บ้านเลขที่นี้ยังไม่มีในระบบชุมชน สามารถลงทะเบียนเพิ่มใหม่ได้
                    </p>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      ชื่อเจ้าของบ้าน / ผู้เช่า
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ป้อนชื่อ-นามสกุลของคุณ"
                      value={ownerNameInput}
                      onChange={(e) => setOwnerNameInput(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    เจ้าของบ้าน: {searchedHouse.owner_name || "-"}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSearchedHouse(null)}
                  className="flex-1 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  ย้อนกลับ
                </button>
                <button
                  onClick={handleConfirmRegister}
                  disabled={registering}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {registering ? "กำลังบันทึก..." : "ยืนยันผูก LINE"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
