"use client";

import { getInitials, getAvatarColor } from "@/lib/utils";

export default function PatientCardList({
  patients,
  selectedPatientId,
  onSelectPatient,
}) {

  return (
    <div className="space-y-3">
      {patients.map((patient) => {
        const patientName = patient.user_id?.name || patient.name;
        const initials = getInitials(patientName);
        const isSelected = selectedPatientId === patient._id;

        return (
          <button
            key={patient._id}
            onClick={() => onSelectPatient(patient)}
            className={`w-full p-4 border rounded-lg transition-all ${
              isSelected
                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-4">
              {/* Avatar with initials */}
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${getAvatarColor(
                  patientName,
                )}`}
              >
                {initials}
              </div>

              {/* Patient info */}
              <div className="flex-1 text-left">
                <div className="font-semibold text-sm text-gray-900">
                  {patientName}
                </div>
                <div className="mt-1 space-y-0.5">
                  {patient.email && (
                    <div className="text-xs text-gray-600">
                      📧 {patient.email}
                    </div>
                  )}
                  {patient.phone ? (
                    <div className="text-xs text-gray-600">
                      📱 {patient.phone}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">📱 Not provided</div>
                  )}
                </div>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <div className="text-blue-500 flex-shrink-0">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
