import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="text-7xl font-bold" style={{ color: "var(--primary)" }}>404</div>
      <h2 className="text-xl font-semibold" style={{ color: "var(--text)" }}>Page Not Found</h2>
      <p className="text-gray-500">The page you're looking for doesn't exist.</p>
      <Link
        href="/"
        className="px-6 py-2 rounded-lg text-white font-medium"
        style={{ background: "var(--primary)" }}
      >
        Go Home
      </Link>
    </div>
  );
}
