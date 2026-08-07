import { cn } from "@/lib/utils";

/** Wordmark-only brand lockup — no icon/logo mark anywhere in the product. */
export function BrandLogo({
  className,
  showWord = true,
}: {
  className?: string;
  showWord?: boolean;
}) {
  if (!showWord) return null;
  return (
    <span className={cn("inline-flex items-center", className)}>
      <span className="text-[1.05rem] font-extrabold tracking-tight">
        Syncd<span className="text-primary">In</span>
      </span>
    </span>
  );
}
