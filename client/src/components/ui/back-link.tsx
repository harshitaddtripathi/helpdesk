import { ArrowLeft } from "lucide-react";
import { Link, type LinkProps } from "react-router";
import { cn } from "../../lib/utils";

export function BackLink({ children, className, ...props }: LinkProps) {
  return (
    <Link
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-950",
        className
      )}
      {...props}
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {children}
    </Link>
  );
}
