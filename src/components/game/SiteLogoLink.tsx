import Link from "next/link";

export function SiteLogoLink({ href }: { href: string }) {
  return (
    <Link className="site-logo" href={href} aria-label="HUMAN VS AI">
      <span className="site-logo-mark" aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="site-logo-text">HUMAN VS AI</span>
    </Link>
  );
}
