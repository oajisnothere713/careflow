"use client";

import { useState, useEffect } from "react";
import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "@/lib/api";
import useStore from "@/lib/store";
import ClinicForm from "@/components/forms/ClinicForm";

export default function ClinicsView() {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClinic, setEditingClinic] = useState(null);

  const storeClinics = useStore((s) => s.setClinics);

  const fetchClinics = async () => {
    setLoading(true);
    try {
      const res = await api.get("/clinics");
      const list = res.data?.clinics || res.data || [];
      setClinics(list);
      storeClinics(list);
    } catch {
      toast.error("Failed to load clinics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClinics();
  }, []);

  const handleSave = async (data) => {
    try {
      if (editingClinic) {
        await api.put(`/clinics/${editingClinic._id}`, data);
        toast.success("Clinic updated");
      } else {
        await api.post("/clinics", data);
        toast.success("Clinic created");
      }
      setShowForm(false);
      setEditingClinic(null);
      fetchClinics();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save clinic");
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await api.delete(`/clinics/${id}`);
      toast.success("Clinic deactivated");
      fetchClinics();
    } catch {
      toast.error("Failed to deactivate clinic");
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Clinics</h2>
        <button
          onClick={() => {
            setEditingClinic(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-md"
          style={{ background: "var(--primary)" }}
        >
          <FiPlus size={16} /> Create Clinic
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : clinics.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No clinics yet. Create one to get started.
        </div>
      ) : (
        <div
          className="border rounded-lg overflow-x-auto"
          style={{ borderColor: "var(--border)" }}
        >
          <table className="w-full text-sm min-w-150">
            <thead>
              <tr
                className="bg-gray-50 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Name
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  City
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Phone
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Specialties
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {clinics.map((c) => (
                <tr
                  key={c._id}
                  className="border-b hover:bg-gray-50 transition-colors"
                  style={{ borderColor: "var(--border)" }}
                >
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.address?.city || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.contact?.phone || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.status === "active"
                          ? "bg-green-100 text-green-700"
                          : c.status === "inactive"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {c.status || "active"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.specialties?.slice(0, 3).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        setEditingClinic(c);
                        setShowForm(true);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-500 mr-1"
                    >
                      <FiEdit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeactivate(c._id)}
                      className="p-2 text-gray-400 hover:text-red-500"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <ClinicForm
          clinic={editingClinic}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingClinic(null);
          }}
        />
      )}
    </div>
  );
}
