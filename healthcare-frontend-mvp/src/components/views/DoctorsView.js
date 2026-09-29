"use client";

import { useState, useEffect } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "@/lib/api";
import useStore from "@/lib/store";
import DoctorForm from "@/components/forms/DoctorForm";

export default function DoctorsView() {
  const selectedClinic = useStore((s) => s.selectedClinic);
  const setDoctors = useStore((s) => s.setDoctors);
  const [doctors, setLocalDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  const fetchDoctors = async () => {
    if (!selectedClinic?._id) {
      setLocalDoctors([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/doctors/clinic/${selectedClinic._id}`);
      const list = res.data?.doctors || res.data || [];
      setLocalDoctors(list);
      setDoctors(list);
    } catch {
      toast.error("Failed to load doctors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [selectedClinic?._id]);

  const handleSave = async (data) => {
    try {
      if (editingDoctor) {
        await api.put(`/doctors/${editingDoctor._id}`, data);
        toast.success("Doctor updated");
      } else {
        const payload = {
          ...data,
          targetClinicId: selectedClinic._id,
        };
        await api.post("/doctors/onboard", payload);
        toast.success("Doctor onboarded");
      }
      setShowForm(false);
      setEditingDoctor(null);
      fetchDoctors();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save doctor");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/doctors/${id}`);
      toast.success("Doctor removed");
      setSelectedDoctor(null);
      fetchDoctors();
    } catch {
      toast.error("Failed to remove doctor");
    }
  };

  if (!selectedClinic) {
    return (
      <div className="p-6 text-gray-400">
        Select a clinic from the sidebar to manage doctors.
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Doctors</h2>
          <p className="text-sm text-gray-500">{selectedClinic.name}</p>
        </div>
        <button
          onClick={() => {
            setEditingDoctor(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-md"
          style={{ background: "var(--primary)" }}
        >
          <FiPlus size={16} /> Onboard Doctor
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No doctors yet. Onboard one to get started.
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
                  Specialization
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Experience
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Fee
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Status
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((d) => (
                <tr
                  key={d._id}
                  className="border-b hover:bg-gray-50 transition-colors cursor-pointer"
                  style={{ borderColor: "var(--border)" }}
                  onClick={() => setSelectedDoctor(d)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      Dr. {d.user_id?.name || d.name || "Unknown"}
                    </div>
                    <div className="text-xs text-gray-400">
                      {d.user_id?.email || d.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {d.specialization || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {d.experience_years ? `${d.experience_years} yrs` : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {d.consultation_fee ? `₹${d.consultation_fee}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        d.availability_status === "available"
                          ? "bg-green-100 text-green-700"
                          : d.availability_status === "on_leave"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {d.availability_status || "available"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingDoctor(d);
                        setShowForm(true);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-500 mr-1 transition-colors"
                    >
                      <FiEdit2 size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          confirm(
                            "Are you sure you want to delete this doctor?",
                          )
                        ) {
                          handleDelete(d._id);
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
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

      {/* Doctor Details Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className="sticky top-0 flex items-center justify-between p-4 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <h2 className="text-lg font-semibold">
                Dr.{" "}
                {selectedDoctor.user_id?.name ||
                  selectedDoctor.name ||
                  "Unknown"}
              </h2>
              <button
                onClick={() => setSelectedDoctor(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Personal Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Personal Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide">
                      Name
                    </p>
                    <p className="font-medium text-gray-800">
                      Dr.{" "}
                      {selectedDoctor.user_id?.name ||
                        selectedDoctor.name ||
                        "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide">
                      Email
                    </p>
                    <p className="font-medium text-gray-800">
                      {selectedDoctor.user_id?.email ||
                        selectedDoctor.email ||
                        "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide">
                      Phone
                    </p>
                    <p className="font-medium text-gray-800">
                      {selectedDoctor.phone || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide">
                      Gender
                    </p>
                    <p className="font-medium text-gray-800 capitalize">
                      {selectedDoctor.gender || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Professional Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide">
                      Specialization
                    </p>
                    <p className="font-medium text-gray-800">
                      {selectedDoctor.specialization || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide">
                      Experience
                    </p>
                    <p className="font-medium text-gray-800">
                      {selectedDoctor.experience_years
                        ? `${selectedDoctor.experience_years} years`
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide">
                      License Number
                    </p>
                    <p className="font-medium text-gray-800">
                      {selectedDoctor.license_number || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide">
                      License Expiry
                    </p>
                    <p className="font-medium text-gray-800">
                      {selectedDoctor.license_expiry_date
                        ? new Date(
                            selectedDoctor.license_expiry_date,
                          ).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Consultation Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Consultation Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide">
                      Consultation Fee
                    </p>
                    <p className="font-medium text-gray-800">
                      ₹{selectedDoctor.consultation_fee || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide">
                      Availability Status
                    </p>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        selectedDoctor.availability_status === "available"
                          ? "bg-green-100 text-green-700"
                          : selectedDoctor.availability_status === "on_leave"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {selectedDoctor.availability_status || "available"}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide">
                      Consultation Type
                    </p>
                    <p className="font-medium text-gray-800 capitalize">
                      {selectedDoctor.consultation_type?.replace(/_/g, " ") ||
                        "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Qualifications */}
              {selectedDoctor.qualifications &&
                selectedDoctor.qualifications.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Qualifications
                    </h4>
                    <div className="space-y-2 text-sm">
                      {selectedDoctor.qualifications.map((q, idx) => (
                        <p key={idx} className="text-gray-700">
                          • {q}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

              {/* Bio */}
              {selectedDoctor.bio && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Bio
                  </h4>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                    {selectedDoctor.bio}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div
                className="flex gap-2 pt-4 border-t"
                style={{ borderColor: "var(--border)" }}
              >
                <button
                  onClick={() => {
                    setEditingDoctor(selectedDoctor);
                    setShowForm(true);
                    setSelectedDoctor(null);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm rounded-md text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors"
                >
                  <FiEdit2 size={16} /> Edit Doctor
                </button>
                <button
                  onClick={() => {
                    if (
                      confirm("Are you sure you want to delete this doctor?")
                    ) {
                      handleDelete(selectedDoctor._id);
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm rounded-md text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                >
                  <FiTrash2 size={16} /> Delete Doctor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <DoctorForm
          doctor={editingDoctor}
          clinicId={selectedClinic._id}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingDoctor(null);
          }}
        />
      )}
    </div>
  );
}
