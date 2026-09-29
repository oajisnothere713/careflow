"use client";

import { useState } from "react";
import { FiX } from "react-icons/fi";
import { SPECIALTIES_LIST as SPECIALIZATION_LIST } from "@/lib/constants";

export default function DoctorForm({ doctor, clinicId, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: doctor?.name || doctor?.user_id?.name || "",
    email: doctor?.email || doctor?.user_id?.email || "",
    phone: doctor?.phone || doctor?.user_id?.phone || "",
    specialization: doctor?.specialization || "",
    license_number: doctor?.license_number || "",
    experience_years: doctor?.experience_years || "",
    consultation_fee: doctor?.consultation_fee || "",
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        ...form,
        experience_years: Number(form.experience_years) || 0,
        consultation_fee: Number(form.consultation_fee) || 0,
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
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <h2 className="text-lg font-semibold">
            {doctor ? "Edit Doctor" : "Onboard Doctor"}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
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

          {/* Email + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          {/* Specialization + License */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specialization *
              </label>

              <select
                value={form.specialization}
                onChange={(e) => set("specialization", e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: "var(--border)" }}
              >
                <option value="">Select Specialization</option>
                {SPECIALIZATION_LIST.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                License Number
              </label>
              <input
                value={form.license_number}
                onChange={(e) => set("license_number", e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: "var(--border)" }}
              />
            </div>
          </div>

          {/* Experience + Fee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Experience (years)
              </label>
              <input
                type="number"
                value={form.experience_years}
                onChange={(e) => set("experience_years", e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: "var(--border)" }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Consultation Fee (₹)
              </label>
              <input
                type="number"
                value={form.consultation_fee}
                onChange={(e) => set("consultation_fee", e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: "var(--border)" }}
              />
            </div>
          </div>

          {/* Buttons */}
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
              {loading ? "Saving..." : doctor ? "Update" : "Onboard"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
