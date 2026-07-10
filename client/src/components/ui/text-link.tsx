import { Link, type LinkProps } from "react-router";
import { cn } from "../../lib/utils";

export function TextLink({ className, ...props }: LinkProps) {
  return (
    <Link
      className={cn(
        "font-medium text-slate-950 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
        className
      )}
      {...props}
    />
  );
}
