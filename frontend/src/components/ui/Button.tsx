export function Button({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition
        ${
          disabled
            ? "bg-neutral-700 text-neutral-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-500 text-white"
        }
      `}
    >
      {children}
    </button>
  );
}