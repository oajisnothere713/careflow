"use client";

import { useState, useEffect } from "react";
import { FiX, FiEdit2, FiTrash2 } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "@/lib/api";
import PatientForm from "@/components/forms/PatientForm";
import { formatDate } from "@/lib/utils";

export default function PatientDetailModal({ patient, onClose, onRefresh }) {
  const [appointments, setAppointments] = useState([]);
  const [medicalHistory, setMedicalHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        // Fetch appointments for this patient
        const appoRes = await api.get("/appointments", {
          params: { patient_id: patient._id, limit: 100 },
        });
        setAppointments(appoRes.data?.appointments || []);

        // Fetch medical history if endpoint exists
        try {
          const histRes = await api.get(
            `/patients/${patient._id}/medical-history`,
          );
          setMedicalHistory(histRes.data);
        } catch {
          // Medical history endpoint may not exist yet
          setMedicalHistory(null);
        }
      } catch (err) {
        console.error("Failed to load patient details:", err);
      } finally {
        setLoading(false);
      }
    };

    if (patient?._id) {
      fetchDetails();
    }
  }, [patient?._id]);

  const handleDelete = async () => {
    if (!confirm("Delete this patient? This cannot be undone.")) return;
    try {
      await api.delete(`/patients/${patient._id}`);
      toast.success("Patient deleted");
      onClose();
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete patient");
    }
  };

  const handleSave = async (data) => {
    try {
      await api.put(`/patients/${patient._id}`, data);
      toast.success("Patient updated");
      setEditMode(false);
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update patient");
    }
  };

  if (editMode) {
    return (
      <PatientForm
        patient={patient}
        clinicId={patient.clinic_id}
        onSave={handleSave}
        onCancel={() => setEditMode(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div>
            <h2 className="text-lg font-semibold">
              {patient.name || patient.user_id?.name}
            </h2>
            <p className="text-sm text-gray-500">MRN: {patient.patient_id}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditMode(true)}
              className="p-2 text-gray-500 hover:text-blue-600"
              title="Edit patient"
            >
              <FiEdit2 size={18} />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 text-gray-500 hover:text-red-600"
              title="Delete patient"
            >
              <FiTrash2 size={18} />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6">
          {/* Patient Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-gray-500">Email</label>
                <p className="font-medium">
                  {patient.email || patient.user_id?.email}
                </p>
              </div>
              <div>
                <label className="text-gray-500">Phone</label>
                <p className="font-medium">
                  {patient.phone || patient.user_id?.phone}
                </p>
              </div>
              <div>
                <label className="text-gray-500">Gender</label>
                <p className="font-medium capitalize">
                  {patient.gender || "—"}
                </p>
              </div>
              <div>
                <label className="text-gray-500">Date of Birth</label>
                <p className="font-medium">
                  {formatDate(patient.date_of_birth)}
                </p>
              </div>
              <div>
                <label className="text-gray-500">Blood Group</label>
                <p className="font-medium">{patient.blood_group || "—"}</p>
              </div>
              <div>
                <label className="text-gray-500">Address</label>
                <p className="font-medium">{patient.address || "—"}</p>
              </div>
              <div className="col-span-2">
                <label className="text-gray-500">Emergency Contact</label>
                <p className="font-medium">
                  {patient.emergency_contact || "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Appointments */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Appointments ({appointments.length})
            </h3>
            {loading ? (
              <p className="text-gray-400 text-sm">Loading...</p>
            ) : appointments.length === 0 ? (
              <p className="text-gray-400 text-sm">No appointments</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {appointments.map((apt) => (
                  <div
                    key={apt._id}
                    className="p-3 border rounded text-sm"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {apt.doctor_id?.name || apt.doctor_name || "Doctor"}
                        </p>
                        <p className="text-gray-500">
                          {formatDate(apt.appointment_date)}{" "}
                          {apt.appointment_time && `· ${apt.appointment_time}`}
                        </p>
                        {apt.reason && (
                          <p className="text-gray-600 text-xs mt-1">
                            {apt.reason}
                          </p>
                        )}
                      </div>
                      <span
                        className="px-2 py-1 rounded text-xs font-medium text-white flex-shrink-0"
                        style={{
                          background:
                            apt.status === "completed"
                              ? "#4CAF50"
                              : apt.status === "cancelled"
                                ? "#F44336"
                                : apt.status === "confirmed"
                                  ? "#2196F3"
                                  : "#9E9E9E",
                        }}
                      >
                        {apt.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Medical History */}
          {medicalHistory && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Medical History
              </h3>
              <div className="text-sm space-y-2">
                {medicalHistory?.conditions && (
                  <div>
                    <label className="text-gray-500">Conditions</label>
                    <p className="font-medium">
                      {Array.isArray(medicalHistory.conditions)
                        ? medicalHistory.conditions.join(", ") || "—"
                        : "—"}
                    </p>
                  </div>
                )}
                {medicalHistory?.allergies && (
                  <div>
                    <label className="text-gray-500">Allergies</label>
                    <p className="font-medium">
                      {Array.isArray(medicalHistory.allergies)
                        ? medicalHistory.allergies.join(", ") || "—"
                        : "—"}
                    </p>
                  </div>
                )}
                {medicalHistory?.medications && (
                  <div>
                    <label className="text-gray-500">Current Medications</label>
                    <p className="font-medium">
                      {Array.isArray(medicalHistory.medications)
                        ? medicalHistory.medications.join(", ") || "—"
                        : "—"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
