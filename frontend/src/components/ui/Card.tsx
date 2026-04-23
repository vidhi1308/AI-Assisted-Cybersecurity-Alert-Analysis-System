export function Card({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-5">
      {children}
    </div>
  );
}