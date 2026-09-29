"use client";

import { useState, useEffect } from "react";
import {
  FiXCircle,
  FiChevronDown,
  FiCalendar,
  FiUser,
  FiClock,
  FiMapPin,
  FiActivity,
  FiAlertCircle,
  FiRepeat,
} from "react-icons/fi";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import api from "@/lib/api";
import useStore from "@/lib/store";

const STATUS_CONFIG = {
  booked: {
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    label: "Booked",
  },
  confirmed: {
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    label: "Confirmed",
  },
  completed: {
    badge: "bg-green-100 text-green-700 border-green-200",
    dot: "bg-green-500",
    label: "Completed",
  },
  cancelled: {
    badge: "bg-red-100 text-red-700 border-red-200",
    dot: "bg-red-500",
    label: "Cancelled",
  },
  no_show: {
    badge: "bg-gray-100 text-gray-600 border-gray-200",
    dot: "bg-gray-400",
    label: "No Show",
  },
};

function InfoRow({ label, value, capitalize }) {
  return (
    <div>
      <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p
        className={`text-gray-800 text-sm font-medium ${capitalize ? "capitalize" : ""}`}
      >
        {value || "N/A"}
      </p>
    </div>
  );
}

export default function AppointmentsView() {
  const selectedClinic = useStore((s) => s.selectedClinic);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateMode, setDateMode] = useState("week");
  const [customDate, setCustomDate] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const weekStart = dayjs().startOf("week");
  const weekEnd = dayjs().endOf("week");

  const fetchAppointments = async () => {
    if (!selectedClinic?._id) {
      setAppointments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = { clinic_id: selectedClinic._id };
      if (statusFilter) params.status = statusFilter;

      if (dateMode === "today") {
        params.date = dayjs().format("YYYY-MM-DD");
      } else if (dateMode === "custom" && customDate) {
        params.date = customDate;
      } else if (dateMode === "week") {
        params.date_from = weekStart.format("YYYY-MM-DD");
        params.date_to = weekEnd.format("YYYY-MM-DD");
      }

      const res = await api.get("/appointments", { params });
      let data = res.data?.appointments || res.data || [];

      // Client-side week filter fallback (in case the API ignores date_from/date_to)
      if (dateMode === "week") {
        data = data.filter((a) => {
          const d = dayjs(a.appointment_date);
          return !d.isBefore(weekStart, "day") && !d.isAfter(weekEnd, "day");
        });
      }

      setAppointments(data);
    } catch {
      toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [selectedClinic?._id, statusFilter, dateMode, customDate]);

  const handleCancel = async (id) => {
    try {
      await api.put(`/appointments/${id}/cancel`);
      toast.success("Appointment cancelled");
      setExpandedId(null);
      fetchAppointments();
    } catch {
      toast.error("Failed to cancel appointment");
    }
  };

  if (!selectedClinic) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <FiCalendar size={40} className="mb-3 opacity-30" />
        <p>Select a clinic from the sidebar to manage appointments.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Appointments</h2>
        <p className="text-sm text-gray-500 mt-0.5">{selectedClinic.name}</p>
      </div>

      {/* Filter Bar */}
      <div
        className="bg-white border rounded-xl p-4 mb-5 shadow-sm"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Date Toggles */}
          <div className="flex flex-wrap gap-1 bg-gray-100 rounded-lg p-1">
            {[
              { key: "today", label: "Today" },
              { key: "week", label: "This Week" },
              { key: "all", label: "All" },
              { key: "custom", label: "Custom" },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setDateMode(opt.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  dateMode === opt.key
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {dateMode === "custom" && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
              style={{ borderColor: "var(--border)" }}
            />
          )}

          <div className="w-px h-6 bg-gray-200" />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
            style={{ borderColor: "var(--border)" }}
          >
            <option value="">All statuses</option>
            <option value="booked">Booked</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>

          {dateMode === "week" && (
            <span className="text-xs text-gray-400 ml-auto">
              {weekStart.format("MMM D")} – {weekEnd.format("MMM D, YYYY")}
            </span>
          )}
        </div>
      </div>

      {/* Result Count */}
      {!loading && (
        <p className="text-sm text-gray-400 mb-3">
          {appointments.length} appointment
          {appointments.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border rounded-xl h-20 animate-pulse bg-gray-50"
              style={{ borderColor: "var(--border)" }}
            />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-300">
          <FiCalendar size={48} className="mb-3" />
          <p className="font-medium text-gray-400">No appointments found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {appointments.map((a) => {
            const config = STATUS_CONFIG[a.status] || STATUS_CONFIG.no_show;
            const isExpanded = expandedId === a._id;
            const isPastAndActive =
              dayjs(a.appointment_date).isBefore(dayjs(), "day") &&
              (a.status === "booked" || a.status === "confirmed");

            return (
              <div
                key={a._id}
                className={`border rounded-xl overflow-hidden transition-all ${
                  isExpanded ? "shadow-md" : "shadow-sm hover:shadow"
                }`}
                style={{ borderColor: "var(--border)" }}
              >
                {/* Collapsed Row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : a._id)}
                  className={`w-full text-left px-4 py-3.5 transition-colors focus:outline-none ${
                    isExpanded
                      ? "bg-gray-50/80"
                      : "bg-white hover:bg-gray-50/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-linear-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                      {(a.patient?.name || "P")[0].toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-800 text-sm">
                          {a.patient?.name || "Patient"}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${config.badge}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${config.dot}`}
                          />
                          {config.label}
                        </span>
                        {a.visit_type?.toLowerCase().includes("followup") && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-600 border border-purple-200">
                            <FiRepeat size={10} />
                            Follow Up
                          </span>
                        )}
                        {isPastAndActive && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-orange-50 text-orange-600 border border-orange-200">
                            <FiAlertCircle size={10} />
                            Overdue
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-0.5 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <FiUser size={10} />
                          Dr. {a.doctor?.name || "Doctor"}
                          {a.doctor?.specialization && (
                            <span className="text-gray-300">
                              {" "}
                              · {a.doctor.specialization}
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <FiCalendar size={10} />
                          {dayjs(a.appointment_date).format("MMM D, YYYY")}
                        </span>
                        <span className="flex items-center gap-1">
                          <FiClock size={10} />
                          {a.appointment_time}
                        </span>
                      </div>
                    </div>
                    {a.visit_type === "follow_up" && (
                      <span
                        className="flex-shrink-0 inline-flex items-center px-1 py-[1px] rounded-full text-white font-semibold"
                        style={{
                          fontSize: "7px",
                          background: "#7B1FA2",
                        }}
                      >
                        Follow up
                      </span>
                    )}
                    <FiChevronDown
                      size={16}
                      className={`text-gray-300 transition-transform shrink-0 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div
                    className="border-t bg-white px-4 py-4"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Patient */}
                      <div className="rounded-xl border bg-blue-50/50 border-blue-100 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
                            <FiUser size={12} className="text-blue-600" />
                          </span>
                          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                            Patient
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <InfoRow label="Name" value={a.patient?.name} />
                          <InfoRow label="Phone" value={a.patient?.phone} />
                          <InfoRow label="Email" value={a.patient?.email} />
                          <InfoRow
                            label="Gender"
                            value={a.patient?.gender}
                            capitalize
                          />
                          <InfoRow
                            label="Blood Group"
                            value={a.patient?.blood_group}
                          />
                        </div>
                      </div>

                      {/* Doctor */}
                      <div className="rounded-xl border bg-emerald-50/50 border-emerald-100 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center">
                            <FiActivity
                              size={12}
                              className="text-emerald-600"
                            />
                          </span>
                          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                            Doctor
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <InfoRow
                            label="Name"
                            value={
                              a.doctor?.name ? `Dr. ${a.doctor.name}` : null
                            }
                          />
                          <InfoRow
                            label="Specialization"
                            value={a.doctor?.specialization}
                          />
                          <InfoRow
                            label="License No."
                            value={a.doctor?.license_number}
                          />
                          <InfoRow
                            label="Consultation Fee"
                            value={
                              a.doctor?.consultation_fee != null
                                ? `₹${a.doctor.consultation_fee}`
                                : null
                            }
                          />
                        </div>
                      </div>

                      {/* Appointment */}
                      <div className="rounded-xl border bg-amber-50/50 border-amber-100 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center">
                            <FiCalendar size={12} className="text-amber-600" />
                          </span>
                          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                            Appointment
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <InfoRow
                            label="Date"
                            value={dayjs(a.appointment_date).format(
                              "MMM D, YYYY",
                            )}
                          />
                          <InfoRow label="Time" value={a.appointment_time} />
                          <InfoRow
                            label="Duration"
                            value={
                              a.duration_minutes
                                ? `${a.duration_minutes} min`
                                : null
                            }
                          />
                          <InfoRow
                            label="Priority"
                            value={a.priority}
                            capitalize
                          />
                          <InfoRow
                            label="Visit Type"
                            value={a.visit_type?.replace(/_/g, " ")}
                            capitalize
                          />
                          <InfoRow label="Status" value={a.status} capitalize />
                        </div>
                      </div>

                      {/* Clinic */}
                      <div className="rounded-xl border bg-violet-50/50 border-violet-100 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-6 h-6 rounded-md bg-violet-100 flex items-center justify-center">
                            <FiMapPin size={12} className="text-violet-600" />
                          </span>
                          <span className="text-xs font-semibold text-violet-600 uppercase tracking-wider">
                            Clinic
                          </span>
                        </div>
                        <div className="space-y-2">
                          <InfoRow label="Name" value={a.clinic?.name} />
                          <InfoRow
                            label="Address"
                            value={
                              a.clinic?.address
                                ? `${a.clinic.address.street}, ${a.clinic.address.city}, ${a.clinic.address.state} ${a.clinic.address.postal_code}`
                                : null
                            }
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <InfoRow
                              label="Phone"
                              value={a.clinic?.contact?.phone}
                            />
                            <InfoRow
                              label="Email"
                              value={a.clinic?.contact?.email}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Reason for Visit */}
                    {a.reason_for_visit && (
                      <div className="mt-3 rounded-xl border bg-gray-50 border-gray-100 p-4">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                          Reason for Visit
                        </p>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {a.reason_for_visit}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    {(a.status === "booked" || a.status === "confirmed") && (
                      <div
                        className="mt-4 pt-3 border-t flex gap-2"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <button
                          onClick={() => handleCancel(a._id)}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
                        >
                          <FiXCircle size={14} />
                          Cancel Appointment
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
