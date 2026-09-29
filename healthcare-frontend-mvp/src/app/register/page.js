"use client";

import { useRouter } from "next/navigation";
import useStore from "@/lib/store";
import PatientRegistrationFlowPage from "@/components/PatientRegistrationFlowPage";

export default function RegisterPage() {
  const router = useRouter();
  const selectedClinic = useStore((s) => s.selectedClinic);

  if (!selectedClinic) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          No Clinic Selected
        </h2>
        <p className="text-gray-500 mb-4">
          Please select a clinic from the sidebar to proceed with registration.
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 text-sm text-white rounded-md"
          style={{ background: "var(--primary)" }}
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <PatientRegistrationFlowPage
      clinicId={selectedClinic._id}
      onSuccess={() => {
        router.push("/");
      }}
    />
  );
}
