"use client";

import VisitCard from "@/components/VisitCard";

export default function VisitHistoryTimeline({ visits }) {
  if (!visits || visits.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No previous visits found. This is a first-time patient.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div className="absolute left-[5px] top-3 bottom-3 w-0.5 bg-gray-200" />

      <div className="space-y-1">
        {visits.map((visit, i) => (
          <VisitCard
            key={visit._id || i}
            visit={visit}
            defaultExpanded={i === 0}
          />
        ))}
      </div>
    </div>
  );
}
