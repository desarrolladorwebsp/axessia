const sizeClasses = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-10 w-10 text-xs",
};

export default function Avatar({ name, size = "md" }: { name: string; size?: keyof typeof sizeClasses }) {
  const initials = name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "CL";
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-[var(--blue)]/10 font-extrabold text-[var(--blue)] ${sizeClasses[size]}`}>
      {initials}
    </span>
  );
}
