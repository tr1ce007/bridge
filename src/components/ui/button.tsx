import type { ComponentProps, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-fg hover:bg-primary-hover",
  ghost: "border border-border text-fg hover:border-fg/40 hover:bg-subtle",
};

export function buttonClasses(variant: Variant = "primary", className?: string) {
  return cn(base, variants[variant], className);
}

type LinkButtonProps = {
  href: ComponentProps<typeof Link>["href"];
  variant?: Variant;
  className?: string;
  children: ReactNode;
};

type NativeButtonProps = ComponentProps<"button"> & { href?: undefined; variant?: Variant };

/**
 * Pill button. With `href` it renders a locale-aware <Link>; otherwise a <button>
 * (type defaults to "button").
 */
export function Button(props: LinkButtonProps | NativeButtonProps) {
  if (props.href !== undefined) {
    const { href, variant, className, children } = props;
    return (
      <Link href={href} className={buttonClasses(variant, className)}>
        {children}
      </Link>
    );
  }
  const { variant, className, type = "button", ...rest } = props;
  return <button type={type} className={buttonClasses(variant, className)} {...rest} />;
}
