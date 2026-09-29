export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen w-full">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: "var(--primary)" }} />
    </div>
  );
}
