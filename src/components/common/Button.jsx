import { LoaderCircle } from "lucide-react";

export default function Button({
  children,
  variant = "primary",
  className = "",
  loading = false,
  disabled = false,
  ...props
}) {
  const base =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55";
  const variants = {
    primary: "bg-ink text-white shadow-sm hover:-translate-y-0.5 hover:bg-black hover:shadow-md",
    secondary: "border border-black/10 bg-white text-ink hover:border-black/25 hover:bg-black/[0.03]",
    subtle: "text-muted hover:bg-black/[0.05] hover:text-ink",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={disabled || loading} {...props}>
      {loading && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
