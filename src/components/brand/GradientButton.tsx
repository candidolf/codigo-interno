import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export const GradientButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => (
    <Button
      ref={ref}
      className={cn(
        "bg-gradient-brand text-white border-0 shadow-[0_10px_30px_-10px_oklch(0.55_0.25_295/0.6)] hover:opacity-95 hover:shadow-[0_15px_40px_-12px_oklch(0.55_0.25_295/0.7)] transition-all",
        className,
      )}
      {...props}
    />
  ),
);
GradientButton.displayName = "GradientButton";
