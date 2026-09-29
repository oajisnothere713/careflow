"use client";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { FiMenu } from "react-icons/fi";

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col md:flex-row w-full h-screen">
      {/* Mobile top header */}
      <div
        className="flex md:hidden items-center h-14 px-4 border-b bg-white shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-gray-600 hover:text-gray-900"
          aria-label="Open navigation"
        >
          <FiMenu size={22} />
        </button>
        <span
          className="ml-3 font-semibold"
          style={{ color: "var(--primary)" }}
        >
          Healthcare Portal
        </span>
      </div>

      {/* Overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto bg-white flex flex-col">
        {children}
      </main>
    </div>
  );
}
