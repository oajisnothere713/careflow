"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
export default function Home() {
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;

    window.location.replace("/clinics");
  }, []);

  // Show loading while redirecting with a direct fallback link
  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full gap-3">
      <div
        className="animate-spin rounded-full h-10 w-10 border-b-2"
        style={{ borderColor: "var(--primary)" }}
      />
      <p className="text-sm font-medium text-gray-600">
        Loading Healthcare Portal...
      </p>
      <Link
        href="/clinics"
        className="text-xs text-blue-500 hover:underline mt-2"
      >
        Click here if you are not redirected automatically &rarr;
      </Link>
    </div>
  );
}
