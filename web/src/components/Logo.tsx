export function Logo({ compact }: { compact?: boolean }) {
  return (
    <img
      src="/logo.png"
      alt="Lit Libs"
      className={["object-contain", compact ? "h-40 w-28" : "h-80 w-56"].join(
        " ",
      )}
    />
  );
}
