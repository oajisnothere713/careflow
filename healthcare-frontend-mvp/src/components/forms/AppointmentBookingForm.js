"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import dayjs from "dayjs";
import toast from "react-hot-toast";

// Fixed 9 AM – 7 PM slots, 1 hour each (last slot 18:00 covers 6 PM–7 PM)
const ALL_TIME_SLOTS = [];
for (let h = 9; h < 19; h++) {
  ALL_TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
}

const formatTime = (time) => {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
};

export default function AppointmentBookingForm({
  clinicId,
  patientData,
  onBack,
  onSuccess,
}) {
  const [doctors, setDoctors] = useState([]);
  const [availableSlots, setAvailableSlots] = useState(null);
  const [bookedSlots, setBookedSlots] = useState(new Set());
  const [slotRefreshKey, setSlotRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [form, setForm] = useState({
    doctor_id: "",
    appointment_date: "",
    appointment_time: "",
    reason_for_visit: "",
    visit_type: "first_visit",
    priority: "normal",
  });

  // Fetch doctors on mount
  useEffect(() => {
    if (!clinicId) return;
    api
      .get(`/doctors/clinic/${clinicId}`)
      .then((res) => setDoctors(res.data?.doctors || res.data || []))
      .catch(() => toast.error("Failed to fetch doctors"));
  }, [clinicId]);

  // Fetch available slots when doctor + date change
  useEffect(() => {
    if (!form.doctor_id || !form.appointment_date) {
      setAvailableSlots(null);
      return;
    }
    setLoadingSlots(true);
    setBookedSlots(new Set());
    setForm((prev) => ({ ...prev, appointment_time: "" }));
    api
      .get(`/appointments/doctor/${form.doctor_id}/available-slots`, {
        params: { date: form.appointment_date, days: 1 },
      })
      .then((res) => {
        console.log("[slots] raw API response:", res.data);

        const normalizeTime = (t) => {
          if (!t) return "";
          const match = String(t).match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
          if (!match) return t;
          let [, h, m, period] = match;
          h = parseInt(h);
          if (period) {
            if (period.toUpperCase() === "PM" && h !== 12) h += 12;
            if (period.toUpperCase() === "AM" && h === 12) h = 0;
          }
          return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        };

        const data = res.data;

        // Case 1: {days: [{date, available_slots: [...], booked_slots: [...]}]}
        // Use days[0] directly — we always request days=1, so the first entry is always the right day
        if (Array.isArray(data?.days) && data.days.length > 0) {
          const day = data.days[0];
          if (day?.available_slots != null) {
            setAvailableSlots(day.available_slots.map(normalizeTime));
            if (Array.isArray(day.booked_slots)) {
              setBookedSlots(
                new Set(
                  day.booked_slots.map((b) => normalizeTime(b.time ?? b)),
                ),
              );
            }
            return;
          }
        }

        // Case 2: {available_slots: [...]} flat
        if (Array.isArray(data?.available_slots)) {
          setAvailableSlots(data.available_slots.map(normalizeTime));
          return;
        }

        // Case 3: direct array
        if (Array.isArray(data)) {
          setAvailableSlots(data.map(normalizeTime));
          return;
        }

        // Case 4: {booked_slots: [...]} — invert to get available
        if (Array.isArray(data?.booked_slots)) {
          const booked = new Set(data.booked_slots.map(normalizeTime));
          setAvailableSlots(ALL_TIME_SLOTS.filter((s) => !booked.has(s)));
          return;
        }

        console.warn(
          "[slots] Unrecognized response shape, showing all available",
        );
        setAvailableSlots(null);
      })
      .catch((err) => {
        console.error("[slots] fetch error:", err);
        setAvailableSlots(null);
      })
      .finally(() => setLoadingSlots(false));
  }, [form.doctor_id, form.appointment_date, slotRefreshKey]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.appointment_time) {
      toast.error("Please select a time slot");
      return;
    }
    setLoading(true);
    try {
      await api.post("/appointments", {
        ...form,
        patient_id: patientData._id,
        clinic_id: clinicId,
      });
      // toast.success("Appointment booked successfully!");
      onSuccess?.();
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error(
          err.response?.data?.message ||
            "This slot was just booked by another patient. Please select a different time.",
        );
        // Refresh slot grid so the taken slot turns red, force user to pick again
        setSlotRefreshKey((k) => k + 1);
        setForm((prev) => ({ ...prev, appointment_time: "" }));
      } else {
        toast.error(
          err.response?.data?.message || "Failed to book appointment",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const set = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Patient Info (read-only) */}
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
          Selected Patient
        </p>
        <div className="font-semibold text-gray-900">
          {patientData.user_id?.name || patientData.name}
        </div>
        <div className="text-sm text-gray-600 mt-1 space-y-0.5">
          {patientData.email && <div>📧 {patientData.email}</div>}
          {patientData.phone && <div>📱 {patientData.phone}</div>}
        </div>
      </div>

      {/* Doctor */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Doctor *
        </label>
        <select
          value={form.doctor_id}
          onChange={(e) => set("doctor_id", e.target.value)}
          required
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ borderColor: "var(--border)" }}
        >
          <option value="">Select doctor...</option>
          {doctors.map((d) => (
            <option key={d._id} value={d._id}>
              Dr. {d.user_id?.name || d.name} — {d.specialization}
            </option>
          ))}
        </select>
      </div>

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Appointment Date *
        </label>
        <input
          type="date"
          value={form.appointment_date}
          onChange={(e) => set("appointment_date", e.target.value)}
          required
          min={dayjs().format("YYYY-MM-DD")}
          max={dayjs().add(6, "month").format("YYYY-MM-DD")}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ borderColor: "var(--border)" }}
        />
      </div>

      {/* Time Slots — shown only after doctor + date selected */}
      {form.doctor_id && form.appointment_date && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Time Slot *
            <span className="ml-2 text-xs font-normal text-gray-500">
              (9:00 AM – 7:00 PM)
            </span>
          </label>
          {loadingSlots ? (
            <div className="flex items-center py-4 text-gray-500 text-sm gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-500"></div>
              Loading slots...
            </div>
          ) : (
            <>
              <div className="flex gap-4 mb-3 text-xs text-gray-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-green-100 border border-green-400 inline-block"></span>
                  Available
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-red-100 border border-red-400 inline-block"></span>
                  Booked
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block"></span>
                  Selected
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {ALL_TIME_SLOTS.map((slot) => {
                  const isBooked = bookedSlots.has(slot);
                  const isAvailable = !isBooked;
                  const isSelected = form.appointment_time === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() =>
                        isAvailable && set("appointment_time", slot)
                      }
                      className={`py-2 px-1 text-sm rounded-lg border-2 font-medium transition-all text-center
                        ${
                          isSelected
                            ? "bg-blue-500 border-blue-500 text-white"
                            : isAvailable
                              ? "bg-green-50 border-green-300 text-green-800 hover:bg-green-100 hover:border-green-500"
                              : "bg-red-50 border-red-300 text-red-500 cursor-not-allowed opacity-70"
                        }`}
                    >
                      {formatTime(slot)}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Reason */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reason for Visit *
        </label>
        <input
          value={form.reason_for_visit}
          onChange={(e) => set("reason_for_visit", e.target.value)}
          required
          placeholder="e.g. Regular checkup, chest pain..."
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ borderColor: "var(--border)" }}
        />
      </div>

      {/* Visit Type + Priority */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Visit Type
          </label>
          <select
            value={form.visit_type}
            onChange={(e) => set("visit_type", e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ borderColor: "var(--border)" }}
          >
            <option value="first_visit">First Visit</option>
            <option value="follow_up">Follow Up</option>
            <option value="checkup">Checkup</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            value={form.priority}
            onChange={(e) => set("priority", e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ borderColor: "var(--border)" }}
          >
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
          style={{ borderColor: "var(--border)" }}
        >
          Back
        </button>
        <button
          type="submit"
          disabled={loading || !form.appointment_time}
          className="px-6 py-2 text-sm text-white rounded-lg disabled:opacity-50"
          style={{ background: "var(--primary)" }}
        >
          {loading ? "Booking..." : "Book Appointment"}
        </button>
      </div>
    </form>
  );
}
