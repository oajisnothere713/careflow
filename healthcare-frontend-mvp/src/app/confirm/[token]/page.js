"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiLoader,
  FiCalendar,
  FiUser,
  FiMapPin,
  FiActivity,
  FiAlertCircle,
  FiRefreshCw,
} from "react-icons/fi";
import dayjs from "dayjs";
import api from "@/lib/api";

function DetailRow({ icon: Icon, label, value, highlight }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-b-0">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          background: highlight ? "rgba(33,150,243,0.1)" : "#f5f5f5",
          color: highlight ? "var(--primary)" : "#666",
        }}
      >
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

function ExpiryBadge({ expiresAt }) {
  const hoursLeft = dayjs(expiresAt).diff(dayjs(), "hour");
  const isUrgent = hoursLeft < 6;

  return (
    <div
      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
      style={{
        background: isUrgent ? "rgba(244,67,54,0.08)" : "rgba(255,152,0,0.08)",
        color: isUrgent ? "var(--danger)" : "var(--warning)",
      }}
    >
      <FiAlertCircle size={11} />
      {hoursLeft <= 0
        ? "Expires soon"
        : hoursLeft < 24
          ? `Expires in ${hoursLeft}h`
          : `Expires ${dayjs(expiresAt).format("MMM D")}`}
    </div>
  );
}

function AppointmentDetails({ data }) {
  const displayDate = data?.slot?.date
    ? dayjs(data.slot.date).format("dddd, MMMM D, YYYY")
    : null;

  const displayTime = data?.slot?.time
    ? dayjs(`2000-01-01 ${data.slot.time}`, "YYYY-MM-DD HH:mm").format("h:mm A")
    : null;

  return (
    <div className="rounded-xl border">
      {data?.patient?.name && (
        <DetailRow icon={FiUser} label="Patient" value={data.patient.name} />
      )}
      {data?.doctor?.name && (
        <DetailRow
          icon={FiActivity}
          label="Doctor"
          value={`Dr. ${data.doctor.name}${
            data.doctor.specialization ? ` · ${data.doctor.specialization}` : ""
          }`}
          highlight
        />
      )}
      {data?.clinic?.name && (
        <DetailRow icon={FiMapPin} label="Clinic" value={data.clinic.name} />
      )}
      {displayDate && (
        <DetailRow
          icon={FiCalendar}
          label="Date"
          value={displayDate}
          highlight
        />
      )}
      {displayTime && (
        <DetailRow icon={FiClock} label="Time" value={displayTime} />
      )}
    </div>
  );
}

export default function ConfirmPage({ params }) {
  const { token } = use(params);

  const [details, setDetails] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/confirm/${token}/details`)
      .then((res) => {
        setDetails(res.data);
        setStatus("ready");
      })
      .catch((err) => {
        const msg = err.response?.data?.message || "Token not found or expired";

        if (
          msg.toLowerCase().includes("expired") ||
          err.response?.status === 410
        )
          setStatus("expired");
        else if (
          msg.toLowerCase().includes("already confirmed") ||
          err.response?.status === 400
        )
          setStatus("already_confirmed");
        else setStatus("error");

        setError(msg);
      });
  }, [token]);

  const handleConfirm = async () => {
    setStatus("confirming");
    try {
      await api.post(`/confirm/${token}`);
      setStatus("confirmed");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to confirm";

      if (err.response?.status === 409) setStatus("slot_taken");
      else if (msg.toLowerCase().includes("already confirmed"))
        setStatus("already_confirmed");
      else {
        setError(msg);
        setStatus("error");
      }
    }
  };

  const typeLabel =
    details?.type === "follow_up_confirm"
      ? "Follow-up Appointment"
      : details?.type === "waitlist_confirm"
        ? "Waitlist Appointment"
        : (details?.type?.replace(/_/g, " ") ?? "Appointment");

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-4"
      style={{
        background:
          "linear-gradient(135deg, #e3f2fd 0%, #f5f5f5 60%, #fff 100%)",
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        {/* HEADER */}
        <div
          className="px-6 py-5"
          style={{
            background:
              "linear-gradient(135deg, var(--primary) 0%, #1565c0 100%)",
          }}
        >
          <p className="text-white font-semibold text-sm">
            Appointment Confirmation
          </p>
        </div>

        {/* BODY */}
        <div className="p-6">
          {status === "loading" && (
            <div className="flex flex-col items-center py-10">
              <FiLoader size={30} className="animate-spin mb-3" />
              <p className="text-sm text-gray-500">
                Fetching appointment details…
              </p>
            </div>
          )}

          {status === "ready" && details && (
            <>
              <div className="mb-5">
                <AppointmentDetails data={details} />
              </div>

              <button
                onClick={handleConfirm}
                className="w-full py-3 text-white rounded-xl font-semibold text-sm"
                style={{
                  background:
                    "linear-gradient(135deg, var(--success) 0%, #388e3c 100%)",
                }}
              >
                Confirm Appointment
              </button>
            </>
          )}

          {status === "confirmed" && (
            <div className="text-center py-6">
              <FiCheckCircle
                size={40}
                className="mx-auto text-green-500 mb-3"
              />
              <p className="font-semibold">Appointment Confirmed</p>
            </div>
          )}

          {status === "slot_taken" && (
            <div className="text-center py-6">
              <FiAlertCircle
                size={40}
                className="mx-auto mb-3"
                style={{ color: "var(--warning, #f59e0b)" }}
              />
              <p className="font-semibold text-gray-800 mb-1">
                Slot No Longer Available
              </p>
              <p className="text-sm text-gray-500 mb-5">
                This appointment slot was just booked by another patient.
              </p>
              <Link
                href="/"
                className="inline-block px-5 py-2.5 text-sm text-white rounded-xl font-semibold"
                style={{
                  background:
                    "linear-gradient(135deg, var(--primary) 0%, #1565c0 100%)",
                }}
              >
                Book Another Appointment
              </Link>
            </div>
          )}

          {status === "expired" && (
            <div className="text-center py-6">
              <FiClock size={40} className="mx-auto text-gray-500 mb-3" />
              <p className="font-semibold text-gray-800 mb-1">Link Expired</p>
              <p className="text-sm text-gray-500 mb-5">
                This confirmation link has expired.
              </p>
              <Link
                href="/"
                className="inline-block px-5 py-2.5 text-sm text-white rounded-xl font-semibold"
                style={{
                  background:
                    "linear-gradient(135deg, var(--primary) 0%, #1565c0 100%)",
                }}
              >
                Go to Dashboard
              </Link>
            </div>
          )}

          {status === "already_confirmed" && (
            <div className="text-center py-6">
              <FiCheckCircle size={40} className="mx-auto text-blue-500 mb-3" />
              <p className="font-semibold text-gray-800 mb-1">Already Confirmed</p>
              <p className="text-sm text-gray-500 mb-5">
                This appointment has already been confirmed.
              </p>
              <Link
                href="/"
                className="inline-block px-5 py-2.5 text-sm text-white rounded-xl font-semibold"
                style={{
                  background:
                    "linear-gradient(135deg, var(--primary) 0%, #1565c0 100%)",
                }}
              >
                Go to Dashboard
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className="text-center py-6">
              <FiXCircle size={40} className="mx-auto text-red-500 mb-3" />
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
