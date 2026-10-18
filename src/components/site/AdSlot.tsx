/**
 * Static AdSense placeholder (SEO plan: banner/native only, static HTML, no JS injection, no popunders).
 * Renders a hidden, zero-height marker until NEXT_PUBLIC_ADS_ENABLED=1 so there is no layout shift and no empty box.
 * No publisher id lives in the repo; when ads are approved, the unit markup goes inside this element.
 */
export function AdSlot({ name, format = "banner" }: { name: string; format?: "banner" | "native" }) {
  const enabled = process.env.NEXT_PUBLIC_ADS_ENABLED === "1";
  return (
    <aside
      className={`ad-slot ad-slot-${format}`}
      data-ad-slot-name={name}
      data-ad-format={format}
      data-testid="ad-slot"
      aria-label="Advertisement"
      hidden={!enabled}
    />
  );
}
