"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FiGrid,
  FiUsers,
  FiCalendar,
  FiClipboard,
  FiHome,
  FiUserPlus,
  FiRepeat,
} from "react-icons/fi";
import useStore from "@/lib/store";
import api from "@/lib/api";

const ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "clinic_admin", label: "Clinic Admin" },
  { value: "doctor", label: "Doctor" },
];

const NAV_ITEMS = {
  super_admin: [{ key: "clinics", label: "Clinics", icon: FiHome }],
  clinic_admin: [
    { key: "doctors", label: "Doctors", icon: FiUserPlus },
    { key: "patients", label: "Patients", icon: FiUsers },
    { key: "appointments", label: "Appointments", icon: FiClipboard },
    { key: "followups", label: "Follow-ups", icon: FiRepeat },
  ],
  doctor: [{ key: "calendar", label: "Appointments", icon: FiCalendar }],
};

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    currentRole,
    setCurrentRole,
    selectedClinic,
    setSelectedClinic,
    selectedDoctor,
    setSelectedDoctor,
    clinics,
    setClinics,
    doctors,
    setDoctors,
  } = useStore();

  // Fetch clinics on mount
  useEffect(() => {
    api
      .get("/clinics")
      .then((res) => {
        const list = res.data?.clinics || res.data || [];
        setClinics(list);
        if (list.length > 0 && !selectedClinic) {
          setSelectedClinic(list[0]);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch doctors when clinic changes
  useEffect(() => {
    if (!selectedClinic?._id) {
      setDoctors([]);
      return;
    }
    api
      .get(`/doctors/clinic/${selectedClinic._id}`)
      .then((res) => {
        const list = res.data?.doctors || res.data || [];
        setDoctors(list);
        if (list.length > 0 && !selectedDoctor) {
          setSelectedDoctor(list[0]);
        }
      })
      .catch(() => setDoctors([]));
  }, [selectedClinic?._id]);

  const navItems = NAV_ITEMS[currentRole] || [];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 border-r flex flex-col transform transition-transform duration-200 ease-in-out md:relative md:inset-y-auto md:left-auto md:z-auto md:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
      style={{ background: "var(--sidebar-bg)", borderColor: "var(--border)" }}
    >
      {/* Logo / Title */}
      <div
        className="px-4 py-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <h1
          className="text-lg font-semibold"
          style={{ color: "var(--primary)" }}
        >
          Healthcare Portal
        </h1>
      </div>

      {/* Role Selector */}
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Role
        </label>
        <select
          value={currentRole}
          onChange={(e) => {
            const newRole = e.target.value;
            setCurrentRole(newRole);
            if (newRole === "super_admin") router.push("/clinics");
            else if (newRole === "clinic_admin") router.push("/patients");
            else if (newRole === "doctor") router.push("/calendar");
          }}
          className="w-full px-2 py-1.5 text-sm rounded border bg-white focus:outline-none focus:ring-2"
          style={{
            borderColor: "var(--border)",
            focusRingColor: "var(--primary)",
          }}
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* Context Selectors */}
      {(currentRole === "clinic_admin" || currentRole === "doctor") && (
        <div
          className="px-4 py-3 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Clinic
          </label>
          <select
            value={selectedClinic?._id || ""}
            onChange={(e) => {
              const c = clinics.find((c) => c._id === e.target.value);
              setSelectedClinic(c || null);
              setSelectedDoctor(null);
            }}
            className="w-full px-2 py-1.5 text-sm rounded border bg-white focus:outline-none"
            style={{ borderColor: "var(--border)" }}
          >
            <option value="">Select clinic...</option>
            {clinics.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          {currentRole === "doctor" && (
            <div className="mt-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Doctor
              </label>
              <select
                value={selectedDoctor?._id || ""}
                onChange={(e) => {
                  const d = doctors.find((d) => d._id === e.target.value);
                  setSelectedDoctor(d || null);
                }}
                className="w-full px-2 py-1.5 text-sm rounded border bg-white focus:outline-none"
                style={{ borderColor: "var(--border)" }}
              >
                <option value="">Select doctor...</option>
                {doctors.map((d) => (
                  <option key={d._id} value={d._id}>
                    Dr. {d.user_id?.name || d.name || "Unknown"}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const href = item.key === "followups" ? "/follow-ups" : `/${item.key}`;
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={item.key}
              href={href}
              onClick={() => onClose()}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm mb-0.5 transition-colors"
              style={{
                background: isActive ? "var(--sidebar-active)" : "transparent",
                color: isActive ? "var(--primary)" : "#555",
                fontWeight: isActive ? 600 : 400,
              }}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-4 py-3 border-t text-xs text-gray-400"
        style={{ borderColor: "var(--border)" }}
      >
        MVP Demo — No Auth
      </div>
    </aside>
  );
}
