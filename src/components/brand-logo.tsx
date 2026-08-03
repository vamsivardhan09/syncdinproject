import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  showWord = true,
}: {
  className?: string;
  showWord?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden="true"
        className="brand-gradient-bg flex size-7 items-center justify-center rounded-lg"
      >
        <span className="size-2.5 rounded-full bg-primary-foreground/95" />
      </span>
      {showWord ? (
        <span className="text-[1.05rem] font-extrabold tracking-tight">
          Syncd<span className="text-primary">In</span>
        </span>
      ) : null}
    </span>
  );
}
