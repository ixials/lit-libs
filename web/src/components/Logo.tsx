export function Logo({
  compact,
  src = "/logo.png",
}: {
  compact?: boolean;
  src?: string;
}) {
  return (
    <img
      src={src}
      alt="Lit Libs"
      className={["object-contain", compact ? "h-40 w-28" : "h-80 w-56"].join(
        " ",
      )}
    />
  );
}
