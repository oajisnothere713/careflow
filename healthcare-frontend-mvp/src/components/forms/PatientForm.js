"use client";

import { useState } from "react";
import { FiX } from "react-icons/fi";
import { BLOOD_GROUPS } from "@/lib/constants";

export default function PatientForm({ patient, clinicId, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: patient?.name || patient?.user_id?.name || "",
    email: patient?.email || patient?.user_id?.email || "",
    phone: patient?.phone || patient?.user_id?.phone || "",
    gender: patient?.gender || "male",
    date_of_birth: patient?.date_of_birth?.split("T")[0] || "",
    blood_group: patient?.blood_group || "",
    address: patient?.address || "",
    emergency_contact: patient?.emergency_contact || "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        ...form,
        targetClinicId: clinicId, // Use targetClinicId instead of clinic_id
      });
    } finally {
      setLoading(false);
    }
  };

  const set = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <h2 className="text-lg font-semibold">
            {patient ? "Edit Patient" : "Register Patient"}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ borderColor: "var(--border)" }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: "var(--border)" }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone *
              </label>
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: "var(--border)" }}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                value={form.gender}
                onChange={(e) => set("gender", e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none"
                style={{ borderColor: "var(--border)" }}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={form.date_of_birth}
                onChange={(e) => set("date_of_birth", e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none"
                style={{ borderColor: "var(--border)" }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Blood Group
              </label>
              <select
                value={form.blood_group}
                onChange={(e) => set("blood_group", e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none"
                style={{ borderColor: "var(--border)" }}
              >
                <option value="">Select...</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address (Optional)
            </label>
            <input
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ borderColor: "var(--border)" }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Emergency Contact (Optional)
            </label>
            <input
              value={form.emergency_contact}
              onChange={(e) => set("emergency_contact", e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ borderColor: "var(--border)" }}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
              style={{ borderColor: "var(--border)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm text-white rounded-md disabled:opacity-50"
              style={{ background: "var(--primary)" }}
            >
              {loading ? "Saving..." : patient ? "Update" : "Register"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
