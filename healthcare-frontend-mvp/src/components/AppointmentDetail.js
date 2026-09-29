"use client";

import { useState, useEffect } from "react";
import {
  FiX,
  FiMic,
  FiFileText,
  FiUser,
  FiPhone,
  FiMail,
  FiDroplet,
  FiAlertCircle,
} from "react-icons/fi";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import api from "@/lib/api";
import VisitHistoryTimeline from "@/components/VisitHistoryTimeline";
import RecordingPanel from "@/components/RecordingPanel";
import AIReviewPanel from "@/components/AIReviewPanel";

const STATUS_BADGE = {
  booked: { bg: "#E3F2FD", color: "#1565C0" },
  confirmed: { bg: "#E3F2FD", color: "#1565C0" },
  completed: { bg: "#E8F5E9", color: "#2E7D32" },
  cancelled: { bg: "#FFEBEE", color: "#C62828" },
  no_show: { bg: "#F5F5F5", color: "#616161" },
};

export default function AppointmentDetail({
  appointment,
  onClose,
  onRefresh,
  pageMode = false,
  widePageMode = false,
}) {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("detail"); // detail | recording | review
  const [aiDraft, setAiDraft] = useState(null);

  const patientId = appointment?.patient?._id || appointment?.patient_id;

  // Auto-resume review panel if a draft/reviewed consultation exists for this appointment
  useEffect(() => {
    if (!appointment?._id) return;
    if (["completed", "cancelled"].includes(appointment?.status)) return;
    api
      .get(`/ai/by-appointment/${appointment._id}`)
      .then((res) => {
        setAiDraft(res.data);
        setMode("review");
      })
      .catch(() => {
        // No active draft — stay in detail mode
      });
  }, [appointment?._id]);

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }
    api
      .get(`/patients/${patientId}/history`)
      .then((res) => {
        setHistory(res.data);
      })
      .catch(() => {
        setHistory(null);
      })
      .finally(() => setLoading(false));
  }, [patientId]);

  const patient = history?.patient || appointment?.patient || {};
  const badge = STATUS_BADGE[appointment?.status] || STATUS_BADGE.booked;
  const canRecord = ["booked", "confirmed"].includes(appointment?.status);

  const handleTranscriptReady = (aiData) => {
    setAiDraft(aiData);
    setMode("review");
  };

  const handleSaved = () => {
    setMode("detail");
    setAiDraft(null);
    toast.success("Consultation saved & patient notified");
    onRefresh?.();
  };

  const handleResumeReview = async () => {
    try {
      const res = await api.get(`/ai/by-appointment/${appointment._id}`);
      setAiDraft(res.data);
      setMode("review");
    } catch {
      setAiDraft(null);
    }
  };

  if (widePageMode) {
    return (
      <div className="flex flex-col h-full bg-white overflow-hidden">
        {/* Patient Navbar */}
        <div
          className="flex items-center gap-4 px-6 py-3 bg-gray-50 border-b shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <FiUser size={18} className="text-blue-600" />
          </div>
          {loading ? (
            <div className="flex gap-3 items-center">
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 min-w-0">
              <span className="font-semibold text-gray-900">
                {patient.name || "Unknown Patient"}
              </span>
              {patient.age && (
                <span className="text-sm text-gray-500">{patient.age} yrs</span>
              )}
              {patient.gender && (
                <span className="text-sm text-gray-500 capitalize">
                  {patient.gender}
                </span>
              )}
              {patient.blood_group && (
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <FiDroplet size={11} /> {patient.blood_group}
                </span>
              )}
              {patient.phone && (
                <span className="text-sm text-gray-400 flex items-center gap-1">
                  <FiPhone size={11} /> {patient.phone}
                </span>
              )}
              {patient.email && (
                <span className="text-sm text-gray-400 flex items-center gap-1">
                  <FiMail size={11} /> {patient.email}
                </span>
              )}
              {patient.emergency_contact && (
                <span className="text-sm text-gray-400 flex items-center gap-1">
                  <FiAlertCircle size={11} /> Emergency:{" "}
                  {patient.emergency_contact}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Two-column body */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Left — Appointment detail */}
          <div
            className={`${
              mode === "review"
                ? "flex-1"
                : "w-full md:w-96 lg:w-120 md:shrink-0 border-b md:border-b-0 md:border-r"
            } flex flex-col overflow-y-auto`}
            style={{ borderColor: "var(--border)" }}
          >
            {mode === "detail" && (
              <div className="p-5 flex flex-col gap-4">
                {/* Appointment info card */}
                <div
                  className="p-4 rounded-xl border"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-gray-800">
                      {dayjs(appointment.date).format("MMM D, YYYY")} at{" "}
                      {appointment.time}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      {appointment.status}
                    </span>
                  </div>
                  {appointment.reason && (
                    <div className="text-sm text-gray-500">
                      <span className="font-medium text-gray-700">
                        Reason:{" "}
                      </span>
                      {appointment.reason}
                    </div>
                  )}
                </div>

                {/* Start Recording / Resume Review button */}
                {canRecord &&
                  (aiDraft ? (
                    <button
                      onClick={handleResumeReview}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-white rounded-md"
                      style={{ background: "var(--primary)" }}
                    >
                      <FiFileText size={16} /> Resume Consultation Review
                    </button>
                  ) : (
                    <button
                      onClick={() => setMode("recording")}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-white rounded-md"
                      style={{ background: "var(--primary)" }}
                    >
                      <FiMic size={16} /> Start Consultation Recording
                    </button>
                  ))}
              </div>
            )}

            {mode === "recording" && (
              <RecordingPanel
                appointmentId={appointment._id}
                onCancel={() => setMode("detail")}
                onTranscriptReady={handleTranscriptReady}
              />
            )}

            {mode === "review" && aiDraft && (
              <AIReviewPanel
                aiData={aiDraft}
                onCancel={() => setMode("detail")}
                onReset={() => {
                  setMode("detail");
                  setAiDraft(null);
                }}
                onSaved={handleSaved}
              />
            )}
          </div>

          {/* Right — Visit history (hidden during AI review) */}
          {mode !== "review" && (
            <div className="flex-1 overflow-y-auto p-5">
              <h4 className="font-semibold text-gray-800 mb-4">
                Visit History
              </h4>
              {loading ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Loading history...
                </div>
              ) : (
                <VisitHistoryTimeline visits={history?.visits || []} />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (pageMode) {
    return (
      <div className="flex flex-col h-full overflow-auto bg-white">
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <h3 className="text-lg font-semibold">Appointment Detail</h3>
        </div>

        <div className="flex-1 overflow-auto">
          {mode === "detail" && (
            <>
              {/* Patient Card */}
              <div
                className="p-5 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <FiUser size={22} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-lg">
                      {patient.name || "Unknown"}
                    </h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                      {patient.age && <span>{patient.age} yrs</span>}
                      {patient.gender && (
                        <span className="capitalize">{patient.gender}</span>
                      )}
                      {patient.blood_group && (
                        <span className="flex items-center gap-1">
                          <FiDroplet size={12} /> {patient.blood_group}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-400">
                      {patient.phone && (
                        <span className="flex items-center gap-1">
                          <FiPhone size={12} /> {patient.phone}
                        </span>
                      )}
                      {patient.email && (
                        <span className="flex items-center gap-1">
                          <FiMail size={12} /> {patient.email}
                        </span>
                      )}
                    </div>
                    {patient.emergency_contact && (
                      <div className="mt-1 text-sm text-gray-400 flex items-center gap-1">
                        <FiAlertCircle size={12} /> Emergency:{" "}
                        {patient.emergency_contact}
                      </div>
                    )}
                  </div>
                </div>

                {/* Current appointment info */}
                <div className="mt-4 p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {dayjs(appointment.date).format("MMM D, YYYY")} at{" "}
                      {appointment.time}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      {appointment.status}
                    </span>
                  </div>
                  {appointment.reason && (
                    <div className="text-sm text-gray-500">
                      Reason: {appointment.reason}
                    </div>
                  )}
                </div>

                {/* Start Recording / Resume Review button */}
                {canRecord &&
                  (aiDraft ? (
                    <button
                      onClick={handleResumeReview}
                      className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-white rounded-md"
                      style={{ background: "var(--primary)" }}
                    >
                      <FiFileText size={16} /> Resume Consultation Review
                    </button>
                  ) : (
                    <button
                      onClick={() => setMode("recording")}
                      className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-white rounded-md"
                      style={{ background: "var(--primary)" }}
                    >
                      <FiMic size={16} /> Start Consultation Recording
                    </button>
                  ))}
              </div>

              {/* Visit History */}
              <div className="p-5">
                <h4 className="font-medium mb-3">Visit History</h4>
                {loading ? (
                  <div className="text-center py-8 text-gray-400">
                    Loading history...
                  </div>
                ) : (
                  <VisitHistoryTimeline visits={history?.visits || []} />
                )}
              </div>
            </>
          )}

          {mode === "recording" && (
            <RecordingPanel
              appointmentId={appointment._id}
              onCancel={() => setMode("detail")}
              onTranscriptReady={handleTranscriptReady}
            />
          )}

          {mode === "review" && aiDraft && (
            <AIReviewPanel
              aiData={aiDraft}
              onCancel={() => setMode("detail")}
              onReset={() => {
                setMode("detail");
                setAiDraft(null);
              }}
              onSaved={handleSaved}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="w-120 h-full bg-white shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <h3 className="text-lg font-semibold">Appointment Detail</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {mode === "detail" && (
            <>
              {/* Patient Card */}
              <div
                className="p-5 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <FiUser size={22} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-lg">
                      {patient.name || "Unknown"}
                    </h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                      {patient.age && <span>{patient.age} yrs</span>}
                      {patient.gender && (
                        <span className="capitalize">{patient.gender}</span>
                      )}
                      {patient.blood_group && (
                        <span className="flex items-center gap-1">
                          <FiDroplet size={12} /> {patient.blood_group}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-400">
                      {patient.phone && (
                        <span className="flex items-center gap-1">
                          <FiPhone size={12} /> {patient.phone}
                        </span>
                      )}
                      {patient.email && (
                        <span className="flex items-center gap-1">
                          <FiMail size={12} /> {patient.email}
                        </span>
                      )}
                    </div>
                    {patient.emergency_contact && (
                      <div className="mt-1 text-sm text-gray-400 flex items-center gap-1">
                        <FiAlertCircle size={12} /> Emergency:{" "}
                        {patient.emergency_contact}
                      </div>
                    )}
                  </div>
                </div>

                {/* Current appointment info */}
                <div className="mt-4 p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {dayjs(appointment.date).format("MMM D, YYYY")} at{" "}
                      {appointment.time}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      {appointment.status}
                    </span>
                  </div>
                  {appointment.reason && (
                    <div className="text-sm text-gray-500">
                      Reason: {appointment.reason}
                    </div>
                  )}
                </div>

                {/* Start Recording / Resume Review button */}
                {canRecord &&
                  (aiDraft ? (
                    <button
                      onClick={handleResumeReview}
                      className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-white rounded-md"
                      style={{ background: "var(--primary)" }}
                    >
                      <FiFileText size={16} /> Resume Consultation Review
                    </button>
                  ) : (
                    <button
                      onClick={() => setMode("recording")}
                      className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-white rounded-md"
                      style={{ background: "var(--primary)" }}
                    >
                      <FiMic size={16} /> Start Consultation Recording
                    </button>
                  ))}
              </div>

              {/* Visit History */}
              <div className="p-5">
                <h4 className="font-medium mb-3">Visit History</h4>
                {loading ? (
                  <div className="text-center py-8 text-gray-400">
                    Loading history...
                  </div>
                ) : (
                  <VisitHistoryTimeline visits={history?.visits || []} />
                )}
              </div>
            </>
          )}

          {mode === "recording" && (
            <RecordingPanel
              appointmentId={appointment._id}
              onCancel={() => setMode("detail")}
              onTranscriptReady={handleTranscriptReady}
            />
          )}

          {mode === "review" && aiDraft && (
            <AIReviewPanel
              aiData={aiDraft}
              onCancel={() => setMode("detail")}
              onReset={() => {
                setMode("detail");
                setAiDraft(null);
              }}
              onSaved={handleSaved}
            />
          )}
        </div>
      </div>
    </div>
  );
}
