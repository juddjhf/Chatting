export default function Avatar({ name = "Guest", size = "md", online, className = "" }) {
  const dimension = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-12 w-12 text-base" : "h-10 w-10 text-sm";
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center rounded-full bg-[#ecebe8] font-semibold text-ink ${dimension} ${className}`}>
      {initials}
      {typeof online === "boolean" && (
        <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${online ? "bg-emerald-500" : "bg-gray-300"}`} />
      )}
    </span>
  );
}
