"use client";

export default function Error({ error, reset }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="text-6xl">⚠️</div>
      <h2 className="text-xl font-semibold" style={{ color: "var(--text)" }}>Something went wrong</h2>
      <p className="text-gray-500 text-center max-w-md">{error?.message || "An unexpected error occurred"}</p>
      <button
        onClick={reset}
        className="px-6 py-2 rounded-lg text-white font-medium"
        style={{ background: "var(--primary)" }}
      >
        Try Again
      </button>
    </div>
  );
}
