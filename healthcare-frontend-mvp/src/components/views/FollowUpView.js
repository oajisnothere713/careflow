"use client";

import { useState, useEffect } from "react";
import {
  FiClock,
  FiCalendar,
  FiUser,
  FiActivity,
  FiRefreshCw,
  FiAlertCircle,
  FiZap,
} from "react-icons/fi";
import dayjs from "dayjs";
import api from "@/lib/api";
import useStore from "@/lib/store";

const STATUS_CONFIG = {
  pending: {
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    label: "Pending",
  },
  scheduled: {
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    label: "Scheduled",
  },
  completed: {
    badge: "bg-green-100 text-green-700 border-green-200",
    label: "Completed",
  },
  cancelled: {
    badge: "bg-red-100 text-red-700 border-red-200",
    label: "Cancelled",
  },
  missed: {
    badge: "bg-gray-100 text-gray-500 border-gray-200",
    label: "Missed",
  },
};

const PRIORITY_CONFIG = {
  routine: { badge: "bg-gray-100 text-gray-600", label: "Routine" },
  important: { badge: "bg-blue-50 text-blue-600", label: "Important" },
  urgent: { badge: "bg-red-50 text-red-600", label: "Urgent" },
};

import { fmt, fmtTime } from "@/lib/utils";

export default function FollowUpView() {
  const { selectedClinic } = useStore();
  const [followUps, setFollowUps] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const fetchFollowUps = (clinicId, status, pageNum) => {
    if (!clinicId) return;
    setLoading(true);
    setError("");
    api
      .get("/follow-ups/clinic", {
        params: {
          clinic_id: clinicId,
          ...(status ? { status } : {}),
          page: pageNum,
          limit: 20,
        },
      })
      .then((res) => {
        setFollowUps(res.data?.followUps || []);
        setPagination(res.data?.pagination || null);
      })
      .catch((err) => {
        setError(
          err.response?.data?.message || "Failed to load follow-up records.",
        );
        setFollowUps([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setPage(1);
    fetchFollowUps(selectedClinic?._id, statusFilter, 1);
  }, [selectedClinic?._id, statusFilter]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchFollowUps(selectedClinic?._id, statusFilter, newPage);
  };

  if (!selectedClinic) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Select a clinic from the sidebar to view follow-ups.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Follow-up Tracker</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {selectedClinic.name} — planned vs confirmed appointment dates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ borderColor: "var(--border)" }}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="missed">Missed</option>
          </select>
          <button
            onClick={() =>
              fetchFollowUps(selectedClinic?._id, statusFilter, page)
            }
            disabled={loading}
            className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: "var(--border)" }}
            title="Refresh"
          >
            <FiRefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium bg-sky-100 text-sky-700 border border-sky-200">
            <FiZap size={10} /> Early Slot
          </span>
          Earlier slot found after cancellation (on or after plan date)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700 border border-orange-200">
            <FiAlertCircle size={10} /> Late Date
          </span>
          Confirmed date is later than planned date
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                style={{ background: "var(--sidebar-bg, #f9fafb)" }}
              >
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">
                  <span className="flex items-center gap-1">
                    <FiCalendar size={11} /> Plan Date
                  </span>
                </th>
                <th className="px-4 py-3">
                  <span className="flex items-center gap-1">
                    <FiCalendar size={11} /> Confirmed Date
                  </span>
                </th>
                <th className="px-4 py-3">
                  <span className="flex items-center gap-1">
                    <FiClock size={11} /> Time Slot
                  </span>
                </th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody
              className="divide-y"
              style={{ borderColor: "var(--border)" }}
            >
              {loading && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-gray-400"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-500" />
                      Loading follow-ups…
                    </div>
                  </td>
                </tr>
              )}
              {!loading && followUps.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-gray-400"
                  >
                    No follow-up records found.
                  </td>
                </tr>
              )}
              {!loading &&
                followUps.map((fu) => {
                  const plannedDate = fu.follow_up_date;
                  const confirmedAppt = fu.new_appointment_id;
                  const confirmedDate = confirmedAppt?.appointment_date;
                  const confirmedTime = confirmedAppt?.appointment_time;

                  const originalDate = fu.original_appointment_date;
                  const isEarlySlot =
                    originalDate &&
                    confirmedDate &&
                    plannedDate &&
                    dayjs(originalDate).isAfter(dayjs(plannedDate), "day") &&
                    !dayjs(confirmedDate).isBefore(dayjs(plannedDate), "day") &&
                    dayjs(confirmedDate).isBefore(dayjs(originalDate), "day");
                  const isLateDate =
                    confirmedDate &&
                    plannedDate &&
                    dayjs(confirmedDate).isAfter(dayjs(plannedDate), "day") &&
                    !isEarlySlot;

                  const patientName =
                    fu.patient_id?.user_id?.name ||
                    fu.patient_id?.name ||
                    "Unknown";
                  const doctorName =
                    fu.doctor_id?.user_id?.name ||
                    fu.doctor_id?.name ||
                    "Unknown";

                  const statusCfg =
                    STATUS_CONFIG[fu.status] || STATUS_CONFIG.pending;
                  const priorityCfg =
                    PRIORITY_CONFIG[fu.priority] || PRIORITY_CONFIG.routine;

                  return (
                    <tr
                      key={fu._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {/* Patient */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <FiUser size={12} className="text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {patientName}
                            </p>
                            {fu.patient_id?.user_id?.phone && (
                              <p className="text-xs text-gray-400">
                                {fu.patient_id.user_id.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Doctor */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <FiActivity size={12} className="text-gray-400" />
                          Dr. {doctorName}
                        </div>
                      </td>

                      {/* Purpose */}
                      <td className="px-4 py-3 max-w-[160px]">
                        <p
                          className="text-gray-700 truncate"
                          title={fu.purpose}
                        >
                          {fu.purpose || "—"}
                        </p>
                      </td>

                      {/* Plan Date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-gray-800 font-medium">
                          {fmt(plannedDate)}
                        </span>
                      </td>

                      {/* Confirmed Date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {confirmedDate ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-gray-800 font-medium">
                              {fmt(confirmedDate)}
                            </span>
                            {isEarlySlot && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700 border border-sky-200">
                                <FiZap size={10} /> Early Slot
                              </span>
                            )}
                            {isLateDate && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                                <FiAlertCircle size={10} /> Late Date
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-xs">
                            Not confirmed
                          </span>
                        )}
                      </td>

                      {/* Time Slot */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <FiClock size={12} className="text-gray-400" />
                          {confirmedTime
                            ? fmtTime(confirmedTime)
                            : fu.follow_up_time
                              ? fmtTime(fu.follow_up_time)
                              : "—"}
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${priorityCfg.badge}`}
                        >
                          {priorityCfg.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusCfg.badge}`}
                        >
                          {statusCfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-600"
            style={{ borderColor: "var(--border)" }}
          >
            <span>
              Page {pagination.currentPage} of {pagination.totalPages} —{" "}
              {pagination.totalFollowUps} total
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
                className="px-3 py-1 rounded border hover:bg-gray-50 disabled:opacity-40"
                style={{ borderColor: "var(--border)" }}
              >
                Prev
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => handlePageChange(page + 1)}
                className="px-3 py-1 rounded border hover:bg-gray-50 disabled:opacity-40"
                style={{ borderColor: "var(--border)" }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
