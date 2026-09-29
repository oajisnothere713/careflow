"use client";

import { useState } from "react";
import { FiMail, FiPlus, FiTrash2 } from "react-icons/fi";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import api from "@/lib/api";

export default function AIReviewPanel({ aiData, onCancel, onSaved, onReset }) {
  const consultation = aiData?.consultation || aiData;
  const [patientSummary, setPatientSummary] = useState(
    consultation?.patient_summary || "",
  );
  const [doctorSummary, setDoctorSummary] = useState(
    consultation?.doctor_summary || consultation?.summary || "",
  );
  const [chiefComplaint, setChiefComplaint] = useState(
    consultation?.chief_complaint || "",
  );
  const [diagnosis, setDiagnosis] = useState(consultation?.diagnosis || "");
  const [prescriptions, setPrescriptions] = useState(
    consultation?.prescription_data?.length
      ? consultation.prescription_data.map((med) => ({
          name: med.medicine_name || med.name || "",
          dosage: med.dosage || "",
          frequency: med.frequency || "",
          duration: med.duration || "",
          instructions: med.instructions || "",
        }))
      : [
          {
            name: "",
            dosage: "",
            frequency: "",
            duration: "",
            instructions: "",
          },
        ],
  );
  const [followUpDate, setFollowUpDate] = useState(
    consultation?.follow_up_date
      ? dayjs(consultation.follow_up_date).format("YYYY-MM-DD")
      : "",
  );
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [goingBack, setGoingBack] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [hasSent, setHasSent] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const consultationId = consultation?._id;

  const addPrescription = () => {
    setHasSaved(false);
    setPrescriptions((prev) => [
      ...prev,
      { name: "", dosage: "", frequency: "", duration: "", instructions: "" },
    ]);
  };

  const removePrescription = (index) => {
    setHasSaved(false);
    setPrescriptions((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePrescription = (index, field, value) => {
    setHasSaved(false);
    setPrescriptions((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    );
  };

  const saveEdits = () =>
    api.put(`/ai/${consultationId}/review`, {
      patient_summary: patientSummary,
      doctor_summary: doctorSummary,
      chief_complaint: chiefComplaint,
      diagnosis,
      prescription_data: prescriptions.filter((p) => p.name),
      follow_up_date: followUpDate || undefined,
    });

  const handleSave = async () => {
    if (!consultationId) {
      toast.error("No consultation draft found");
      return;
    }
    if (hasSent) {
      // Send to Patient was already done — just navigate
      onSaved();
      return;
    }
    setSaving(true);
    try {
      await saveEdits();
      setHasSaved(true);
      toast.success("Draft Approved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save consultation");
    } finally {
      setSaving(false);
    }
  };

  const handleSendToPatient = async () => {
    if (!consultationId) {
      toast.error("No consultation draft found");
      return;
    }

    // Warn about incomplete prescription fields
    const activePrescriptions = prescriptions.filter((p) => p.name?.trim());
    const incomplete = activePrescriptions.filter(
      (p) => !p.dosage?.trim() || !p.frequency?.trim() || !p.duration?.trim(),
    );
    if (incomplete.length > 0) {
      const names = incomplete.map((p) => p.name).join(", ");
      toast.error(
        `Please fill in dosage, frequency, and duration for: ${names}`,
      );
      return;
    }

    setSending(true);
    try {
      await saveEdits();
      const res = await api.post(
        `/ai/${consultationId}/save?notify_patient=true`,
      );
      setHasSent(true);
      toast.success("Patient notified");

      // Surface follow-up email status
      if (res.data?.followUpCreated && !res.data?.followUpEmailSent) {
        toast(
          res.data.followUpEmailError
            ? `Follow-up email failed: ${res.data.followUpEmailError}`
            : "Follow-up email could not be sent. Please check doctor's available slots.",
          { icon: "⚠️", duration: 6000 },
        );
      }

      if (hasSaved) {
        onSaved();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send to patient");
    } finally {
      setSending(false);
    }
  };

  const handleBack = async () => {
    if (hasSaved || !consultationId) {
      onCancel();
      return;
    }
    setGoingBack(true);
    try {
      await saveEdits();
      onCancel();
    } catch {
      onCancel();
    } finally {
      setGoingBack(false);
    }
  };

  const handleReset = async () => {
    if (!consultationId) {
      (onReset || onCancel)();
      return;
    }
    setResetting(true);
    try {
      await api.delete(`/ai/${consultationId}`);
      (onReset || onCancel)();
    } catch {
      (onReset || onCancel)();
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <div className="p-5">
        <h4 className="font-semibold mb-4">Review AI-Generated Consultation</h4>
        <p className="text-xs text-gray-400 mb-4">
          Review and edit the AI-generated data below before saving.
        </p>

        <div className="space-y-4">
          {/* Patient Summary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Patient Summary
              <span className="ml-1 text-xs font-normal text-gray-400">
                (what the patient said)
              </span>
            </label>
            <textarea
              value={patientSummary}
              onChange={(e) => {
                setPatientSummary(e.target.value);
                setHasSaved(false);
              }}
              rows={6}
              placeholder="Patient's symptoms, complaints, and concerns..."
              className="w-full px-3 py-2.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              style={{ borderColor: "var(--border)" }}
            />
          </div>

          {/* Doctor Summary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Doctor Summary
              <span className="ml-1 text-xs font-normal text-gray-400">
                (what the doctor said)
              </span>
            </label>
            <textarea
              value={doctorSummary}
              onChange={(e) => {
                setDoctorSummary(e.target.value);
                setHasSaved(false);
              }}
              rows={6}
              placeholder="Doctor's assessment, advice, and instructions..."
              className="w-full px-3 py-2.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              style={{ borderColor: "var(--border)" }}
            />
          </div>

          {/* Chief Complaint */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chief Complaint
            </label>
            <textarea
              value={chiefComplaint}
              onChange={(e) => {
                setChiefComplaint(e.target.value);
                setHasSaved(false);
              }}
              rows={3}
              className="w-full px-3 py-2.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              style={{ borderColor: "var(--border)" }}
            />
          </div>

          {/* Diagnosis */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Diagnosis
            </label>
            <textarea
              value={diagnosis}
              onChange={(e) => {
                setDiagnosis(e.target.value);
                setHasSaved(false);
              }}
              rows={3}
              className="w-full px-3 py-2.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              style={{ borderColor: "var(--border)" }}
            />
          </div>

          {/* Prescriptions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Prescriptions
              </label>
              <button
                onClick={addPrescription}
                className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700"
              >
                <FiPlus size={14} /> Add
              </button>
            </div>
            <div className="space-y-2">
              {prescriptions.map((p, i) => (
                <div
                  key={i}
                  className="border rounded-md p-4 relative"
                  style={{ borderColor: "var(--border)" }}
                >
                  {prescriptions.length > 1 && (
                    <button
                      onClick={() => removePrescription(i)}
                      className="absolute top-2 right-2 text-gray-300 hover:text-red-400"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="Medicine name"
                      value={p.name}
                      onChange={(e) =>
                        updatePrescription(i, "name", e.target.value)
                      }
                      className="px-3 py-2.5 border rounded text-sm focus:outline-none"
                      style={{ borderColor: "var(--border)" }}
                    />
                    <input
                      placeholder="Dosage"
                      value={p.dosage}
                      onChange={(e) =>
                        updatePrescription(i, "dosage", e.target.value)
                      }
                      className="px-3 py-2.5 border rounded text-sm focus:outline-none"
                      style={{ borderColor: "var(--border)" }}
                    />
                    <input
                      placeholder="Frequency"
                      value={p.frequency}
                      onChange={(e) =>
                        updatePrescription(i, "frequency", e.target.value)
                      }
                      className="px-3 py-2.5 border rounded text-sm focus:outline-none"
                      style={{ borderColor: "var(--border)" }}
                    />
                    <input
                      placeholder="Duration"
                      value={p.duration}
                      onChange={(e) =>
                        updatePrescription(i, "duration", e.target.value)
                      }
                      className="px-3 py-2.5 border rounded text-sm focus:outline-none"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </div>
                  <input
                    placeholder="Special instructions"
                    value={p.instructions || ""}
                    onChange={(e) =>
                      updatePrescription(i, "instructions", e.target.value)
                    }
                    className="w-full mt-2 px-3 py-2.5 border rounded text-sm focus:outline-none"
                    style={{ borderColor: "var(--border)" }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Follow-up Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Follow-up Date
            </label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => {
                setFollowUpDate(e.target.value);
                setHasSaved(false);
              }}
              min={dayjs().add(1, "day").format("YYYY-MM-DD")}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none"
              style={{ borderColor: "var(--border)" }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={handleBack}
            disabled={goingBack || resetting || saving || sending}
            className="flex-1 px-4 py-2 text-sm border rounded-md hover:bg-gray-50 text-gray-700 disabled:opacity-50 hover:cursor-pointer"
            style={{ borderColor: "var(--border)" }}
          >
            {goingBack ? "Saving..." : "Back"}
          </button>
          <button
            onClick={handleReset}
            disabled={resetting || goingBack || saving || sending}
            className="flex-1 px-4 py-2 text-sm border rounded-md hover:bg-gray-50 text-red-600 disabled:opacity-50 hover:cursor-pointer"
            style={{ borderColor: "var(--border)" }}
          >
            {resetting ? "Resetting..." : "Reset"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || sending || resetting || goingBack || hasSaved}
            className="flex-1 px-4 py-2 text-sm border rounded-md hover:bg-gray-50 text-gray-700 disabled:opacity-50 hover:cursor-pointer"
            style={{ borderColor: "var(--border)" }}
          >
            {saving ? "Saving..." : hasSaved ? "Approved" : "Approve"}
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={
              sending ||
              saving ||
              resetting ||
              goingBack ||
              hasSent ||
              !hasSaved
            }
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm text-white rounded-md disabled:opacity-50 hover:cursor-pointer"
            style={{ background: "var(--success, #4CAF50)" }}
          >
            <FiMail size={14} />
            {sending ? "Sending..." : hasSent ? "Sent ✓" : "Send to Patient"}
          </button>
        </div>
      </div>

      {/* Send to Patient confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <FiMail size={18} className="text-amber-600" />
              </span>
              <h3 className="font-semibold text-gray-800 text-base">
                Send to Patient?
              </h3>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              This consultation summary, diagnosis, and prescription will be
              emailed to the patient. Please ensure all information is correct
              before sending.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-50 hover:cursor-pointer"
                style={{ borderColor: "var(--border)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  handleSendToPatient();
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm text-white rounded-lg hover:cursor-pointer"
                style={{ background: "var(--success, #4CAF50)" }}
              >
                <FiMail size={14} />
                Yes, Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
