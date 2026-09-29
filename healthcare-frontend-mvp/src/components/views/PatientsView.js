"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiPlus, FiSearch } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "@/lib/api";
import useStore from "@/lib/store";
import PatientForm from "@/components/forms/PatientForm";
import PatientDetailModal from "@/components/modals/PatientDetailModal";

export default function PatientsView() {
  const router = useRouter();
  const selectedClinic = useStore((s) => s.selectedClinic);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [search, setSearch] = useState("");

  const fetchPatients = async () => {
    if (!selectedClinic?._id) {
      setPatients([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = { clinic_id: selectedClinic._id };
      if (search) params.search = search;
      const res = await api.get("/patients", { params });
      setPatients(res.data?.patients || res.data || []);
    } catch {
      toast.error("Failed to load patients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [selectedClinic?._id]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPatients();
  };

  const handleSave = async (data) => {
    try {
      await api.post("/patients/onboard", data);
      toast.success("Patient registered");
      setShowForm(false);
      fetchPatients();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to register patient");
    }
  };

  if (!selectedClinic) {
    return (
      <div className="p-6 text-gray-400">
        Select a clinic from the sidebar to manage patients.
      </div>
    );
  }

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Patients</h2>
          <p className="text-sm text-gray-500">{selectedClinic.name}</p>
        </div>
        <button
          onClick={() => router.push("/register")}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-md"
          style={{ background: "var(--primary)" }}
        >
          <FiPlus size={16} /> Register Patient
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <FiSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ borderColor: "var(--border)" }}
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 text-sm text-white rounded-md"
          style={{ background: "var(--primary)" }}
        >
          Search
        </button>
      </form>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : patients.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No patients found.
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
                  MRN
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Name
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Phone
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Gender
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Blood Group
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  DOB
                </th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr
                  key={p._id}
                  onClick={() => setSelectedPatient(p)}
                  className="border-b hover:bg-gray-50 transition-colors cursor-pointer"
                  style={{ borderColor: "var(--border)" }}
                >
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {p.patient_id || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {p.user_id?.name || p.name || "Unknown"}
                    </div>
                    <div className="text-xs text-gray-400">
                      {p.user_id?.email || p.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.user_id?.phone || p.phone || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">
                    {p.gender || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.blood_group || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(p.date_of_birth)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <PatientForm
          clinicId={selectedClinic._id}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}

      {selectedPatient && (
        <PatientDetailModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
          onRefresh={fetchPatients}
        />
      )}
    </div>
  );
}
