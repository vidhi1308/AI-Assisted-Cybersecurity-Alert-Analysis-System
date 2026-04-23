export function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "high" | "medium" | "low";
}) {
  const styles =
    tone === "high"
      ? "bg-red-600 text-white"
      : tone === "medium"
      ? "bg-amber-500 text-black"
      : "bg-emerald-500 text-black";

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${styles}`}>
      {children}
    </span>
  );
}