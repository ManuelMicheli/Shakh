import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "muted";

const variants: Record<Variant, string> = {
  default: "bg-text text-bg",
  outline: "border border-border text-text",
  muted: "bg-surface-2 text-text-muted",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
