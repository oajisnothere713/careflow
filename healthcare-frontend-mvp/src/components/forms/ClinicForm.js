"use client";

import { useState } from "react";
import { FiX } from "react-icons/fi";
import { SPECIALTIES_LIST } from "@/lib/constants";

export default function ClinicForm({ clinic, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: clinic?.name || "",
    registration_number: clinic?.registration_number || "",
    address: {
      street: clinic?.address?.street || "",
      city: clinic?.address?.city || "",
      state: clinic?.address?.state || "",
      postal_code: clinic?.address?.postal_code || "",
    },
    contact: {
      phone: clinic?.contact?.phone || "",
      email: clinic?.contact?.email || "",
    },
    specialties: clinic?.specialties || [],
  });
  const [loading, setLoading] = useState(false);
  const toggleSpecialty = (specialty) => {
    setForm((prev) => {
      const exists = prev.specialties.includes(specialty);
      return {
        ...prev,
        specialties: exists
          ? prev.specialties.filter((s) => s !== specialty)
          : [...prev.specialties, specialty],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        ...form,
        specialties: form.specialties,
      });
    } finally {
      setLoading(false);
    }
  };

  const set = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));
  const setAddr = (field, value) =>
    setForm((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }));
  const setContact = (field, value) =>
    setForm((prev) => ({
      ...prev,
      contact: { ...prev.contact, [field]: value },
    }));

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <h2 className="text-lg font-semibold">
            {clinic ? "Edit Clinic" : "Create Clinic"}
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
              Clinic Name *
            </label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ borderColor: "var(--border)" }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Registration Number
            </label>
            <input
              value={form.registration_number}
              onChange={(e) => set("registration_number", e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ borderColor: "var(--border)" }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street
              </label>
              <input
                value={form.address.street}
                onChange={(e) => setAddr("street", e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: "var(--border)" }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                value={form.address.city}
                onChange={(e) => setAddr("city", e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: "var(--border)" }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                value={form.address.state}
                onChange={(e) => setAddr("state", e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: "var(--border)" }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Postal Code
              </label>
              <input
                value={form.address.postal_code}
                onChange={(e) => setAddr("postal_code", e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: "var(--border)" }}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                value={form.contact.phone}
                onChange={(e) => setContact("phone", e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: "var(--border)" }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={form.contact.email}
                onChange={(e) => setContact("email", e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: "var(--border)" }}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Specialties
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-auto border p-2 rounded-md">
              {SPECIALTIES_LIST.map((spec) => (
                <label key={spec} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.specialties.includes(spec)}
                    onChange={() => toggleSpecialty(spec)}
                  />
                  {spec}
                </label>
              ))}
            </div>
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
              {loading ? "Saving..." : clinic ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
