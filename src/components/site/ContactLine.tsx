import { CONTACT_EMAIL } from "@/config/site";

/** One-line contact note for info pages (about / privacy). */
export function ContactLine({ lead = "Contact" }: { lead?: string }) {
  return (
    <p className="body-text info-contact">
      {lead}: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
    </p>
  );
}
