"use client";

import { useState } from "react";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";
import dayjs from "dayjs";

const STATUS_DOT = {
  completed: "#4CAF50",
  booked: "#2196F3",
  confirmed: "#2196F3",
  cancelled: "#F44336",
  no_show: "#9E9E9E",
};

export default function VisitCard({ visit, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const dotColor = STATUS_DOT[visit.appointmentStatus] || "#9E9E9E";

  return (
    <div className="relative pl-6">
      {/* Timeline dot */}
      <div
        className="absolute left-0 top-3 w-3 h-3 rounded-full border-2 bg-white"
        style={{ borderColor: dotColor }}
      />

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <FiChevronDown size={14} className="text-gray-400" />
          ) : (
            <FiChevronRight size={14} className="text-gray-400" />
          )}
          <span className="text-sm font-medium">
            {dayjs(visit.date).format("MMM D, YYYY")}
          </span>
          <span className="text-xs text-gray-500">
            Dr. {visit.doctorName || "Unknown"}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: dotColor + "20", color: dotColor }}
          >
            {visit.appointmentStatus}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="ml-5 pb-4 space-y-3">
          {/* Summary */}
          {(visit.aiSummary || visit.summary) && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">
                Summary
              </div>
              <p className="text-sm text-gray-700">
                {visit.aiSummary || visit.summary}
              </p>
            </div>
          )}

          {/* Chief Complaint + Diagnosis */}
          {visit.chiefComplaint && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">
                Chief Complaint
              </div>
              <p className="text-sm text-gray-700">{visit.chiefComplaint}</p>
            </div>
          )}
          {visit.diagnosis && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">
                Diagnosis
              </div>
              <p className="text-sm text-gray-700">{visit.diagnosis}</p>
            </div>
          )}

          {/* Prescription */}
          {visit.prescription?.medications?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">
                Prescription
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500">
                    <th className="text-left py-1 pr-2">Medicine</th>
                    <th className="text-left py-1 pr-2">Dosage</th>
                    <th className="text-left py-1 pr-2">Frequency</th>
                    <th className="text-left py-1">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {visit.prescription.medications.map((med, i) => (
                    <tr key={i} className="text-gray-700">
                      <td className="py-0.5 pr-2">
                        {med.name || med.medicine_name}
                      </td>
                      <td className="py-0.5 pr-2">{med.dosage}</td>
                      <td className="py-0.5 pr-2">{med.frequency}</td>
                      <td className="py-0.5">{med.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Follow-up */}
          {visit.followUp && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">
                Follow-up
              </div>
              <p className="text-sm text-gray-700">
                {visit.followUp.date
                  ? dayjs(visit.followUp.date).format("MMM D, YYYY")
                  : "—"}
                {visit.followUp.status && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({visit.followUp.status})
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
