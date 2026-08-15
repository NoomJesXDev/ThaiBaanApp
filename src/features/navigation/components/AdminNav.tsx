"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  activeIcon: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/admin/dashboard",
    label: "แดชบอร์ดการเงิน",
    icon: "📊",
    activeIcon: "📊",
  },
  {
    href: "/admin/settings/rates",
    label: "สร้างรายการ",
    icon: "⚙️",
    activeIcon: "⚙️",
  },
  {
    href: "/admin/billing",
    label: "สร้างชุดบิลเรียกเก็บ",
    icon: "📄",
    activeIcon: "📄",
  },
  {
    href: "/admin/payments",
    label: "ตรวจสอบสลิป",
    icon: "✅",
    activeIcon: "✅",
  },
  {
    href: "/admin/houses",
    label: "จัดการลูกบ้าน",
    icon: "🏠",
    activeIcon: "🏠",
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 py-4 space-y-1.5">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 group ${
              isActive
                ? "bg-white/15 text-white shadow-xs"
                : "text-white/70 hover:text-white hover:bg-white/5"
            }`}
          >
            <span
              className={`text-lg transition-transform duration-200 group-hover:scale-110 ${
                isActive ? "scale-105" : ""
              }`}
            >
              {isActive ? item.activeIcon : item.icon}
            </span>
            <span>{item.label}</span>
            {isActive && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-18 bg-white/95 backdrop-blur-md border-t border-slate-100 flex items-center justify-around z-50 px-2 pb-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 cursor-pointer select-none"
          >
            <div className="flex flex-col items-center justify-center w-full">
              {/* Icon with horizontal pill background on active */}
              <span
                className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-base transition-all duration-300 ${
                  isActive
                    ? "bg-emerald-50 text-emerald-600 scale-105"
                    : "text-slate-400"
                }`}
              >
                {isActive ? item.activeIcon : item.icon}
              </span>
              
              {/* Label below icon - no wrap */}
              <span
                className={`text-[9px] tracking-tighter mt-1 font-bold whitespace-nowrap transition-colors duration-200 ${
                  isActive ? "text-emerald-600 font-extrabold" : "text-slate-500"
                }`}
              >
                {item.label}
              </span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
