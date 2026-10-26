import type { HTMLAttributes } from "react";

type BrandLogoProps = HTMLAttributes<HTMLElement> & {
  theme?: "light" | "dark";
  compact?: boolean;
};

export function BrandLogo({ theme = "light", compact = false, className = "", ...props }: BrandLogoProps) {
  if (compact) {
    return <img src="/brand/mark-hicash.png" alt="HiCash" width="556" height="557" className={`h-8 w-8 object-contain ${className}`} {...props} />;
  }

  return (
    <picture {...props}>
      <source srcSet={`/brand/logo-hicash-${theme}.webp`} type="image/webp" />
      <img
        src={`/brand/logo-hicash-${theme}.png`}
        alt="HiCash"
        width="1800"
        height="568"
        className={`block h-auto object-contain ${className}`}
      />
    </picture>
  );
}
