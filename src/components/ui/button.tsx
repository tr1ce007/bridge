import type { ComponentProps, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost";

const base =
  "group inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold tracking-[-0.005em] transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-fg shadow-button hover:bg-primary-hover hover:shadow-lift",
  ghost: "border border-border-strong/70 bg-card text-fg hover:border-primary/50 hover:bg-primary-soft hover:text-primary dark:hover:text-fg",
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
