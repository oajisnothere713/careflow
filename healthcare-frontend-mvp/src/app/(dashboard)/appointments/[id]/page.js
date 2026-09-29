"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiLoader } from "react-icons/fi";
import api from "@/lib/api";
import AppointmentDetail from "@/components/AppointmentDetail";
import useStore from "@/lib/store";

export default function AppointmentDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const currentRole = useStore((s) => s.currentRole);
  const initialRole = useRef(currentRole);

  useEffect(() => {
    if (currentRole !== initialRole.current) {
      router.push("/");
    }
  }, [currentRole, router]);

  const fetchAppointment = () => {
    setLoading(true);
    api
      .get(`/appointments/${id}`)
      .then((res) => {
        const appt = res.data.appointment || res.data;
        // Normalize field names to match AppointmentDetail expectations
        setAppointment({
          ...appt,
          date: appt.date || appt.appointment_date,
          time: appt.time || appt.appointment_time,
          reason: appt.reason || appt.reason_for_visit,
          patient: appt.patient || appt.patient_id,
        });
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Appointment not found");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAppointment();
  }, [id]);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Back bar */}
      <div
        className="flex items-center gap-3 px-6 py-3 border-b shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
        >
          <FiArrowLeft size={16} /> Back
        </button>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <FiLoader size={24} className="animate-spin mr-2" /> Loading
          appointment...
        </div>
      )}

      {error && !loading && (
        <div className="flex-1 flex items-center justify-center text-red-400">
          {error}
        </div>
      )}

      {appointment && !loading && (
        <div className="flex-1 overflow-hidden">
          <AppointmentDetail
            appointment={appointment}
            onRefresh={fetchAppointment}
            widePageMode={true}
          />
        </div>
      )}
    </div>
  );
}
