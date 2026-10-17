import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, Ref } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/**
 * 8-bit button, adapted from 8bitcn-ui (MIT, github.com/TheOrcDev/8bitcn-ui).
 * Changes: no radix Slot / shadcn base / Google Fonts import; the notched pixel frame is drawn by
 * `.px-notch` in ui.css from design tokens (it was ten absolutely positioned spans upstream), and the
 * legacy site classes stay on the element so layout CSS and E2E selectors keep working.
 * Renders a Next <Link> when `href` is set, otherwise a <button>.
 */
export const buttonVariants = cva("px-btn", {
  variants: {
    variant: {
      primary: "primary-action px-notch",
      secondary: "secondary-action px-notch",
      text: "text-action",
    },
    size: {
      md: "",
      lg: "btn-lg",
    },
  },
  defaultVariants: { variant: "primary", size: "md" },
});

type Variants = VariantProps<typeof buttonVariants>;
type ButtonProps = Variants & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined; ref?: Ref<HTMLButtonElement> };
type LinkProps = Variants & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; download?: string; native?: boolean; ref?: Ref<HTMLAnchorElement> };

export function Button(props: ButtonProps | LinkProps) {
  const { variant, size, className, ...rest } = props;
  const classes = cn(buttonVariants({ variant, size }), className);
  if (typeof rest.href === "string") {
    const { href, native, ...anchor } = rest as Omit<LinkProps, keyof Variants | "className">;
    // file downloads / blob URLs must be plain anchors
    if (native || anchor.download !== undefined) return <a data-slot="button" className={classes} href={href} {...anchor} />;
    return <Link data-slot="button" className={classes} href={href} {...anchor} />;
  }
  const { type = "button", ...button } = rest as Omit<ButtonProps, keyof Variants | "className">;
  return <button data-slot="button" type={type} className={classes} {...button} />;
}
