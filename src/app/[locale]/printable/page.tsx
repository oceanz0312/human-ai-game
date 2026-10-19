import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";
import { PrintButton } from "@/components/site/PrintButton";
import { AdSlot } from "@/components/site/AdSlot";
import { PrintSheet, type SheetSpec } from "@/games/spot-the-difference/quick/PrintSheet";
import { breadcrumbLd, faqLd, JsonLd } from "@/seo/jsonld";
import { pageMetadata } from "@/lib/page-meta";

const PATH = "/printable";
const TITLE = "Spot the Difference Printable – Free Sheets with Answers | Spot The Difference Game";
const DESCRIPTION = "Free spot the difference printable sheets: three pages of pixel picture puzzles (easy, hard and Christmas) with an answer key. Print or save as PDF.";

export const generateMetadata = () => pageMetadata("en", PATH, { title: TITLE, description: DESCRIPTION });

const SHEETS: SheetSpec[] = [
  { id: "easy", title: "Sheet 1 · Easy (ages 4+)", theme: "everyday", grids: [3, 3, 4, 4], changes: 5 },
  { id: "classic", title: "Sheet 2 · Classic", theme: "everyday", grids: [5, 5, 6, 6], changes: 2 },
  { id: "christmas", title: "Sheet 3 · Christmas", theme: "christmas", grids: [4, 4, 5, 5], changes: 3 },
];

const FAQ = [
  { q: "How do I print these puzzles?", a: "Tap Print puzzles (or use your browser's print menu). Each sheet starts on a new page; choose Save as PDF to keep a copy." },
  { q: "Where are the answers?", a: "Each sheet ends with an answer key giving the row and column of the odd picture." },
  { q: "Can I use them in a classroom?", a: "Yes. The sheets are free for personal and classroom use." },
];

/** Printable spot the difference: real print-ready SVG sheets + answer keys (print CSS hides site chrome). */
export default function Page() {
  return (
    <SiteShell locale="en" path={PATH}>
      <JsonLd data={[breadcrumbLd("en", [{ name: "Home", path: "/" }, { name: "Printable", path: PATH }]), faqLd(FAQ)]} />
      <div className="container kw-page printable-page">
        <section className="kw-hero kw-hero-print">
          <div className="kw-head">
            <h1 className="page-title kw-title">Spot the Difference Printable</h1>
            <p className="kw-lede">Three free sheets – easy, classic and Christmas – with an answer key. Print them or save as PDF.</p>
            <div className="kw-cta">
              <PrintButton />
            </div>
          </div>
        </section>
        <div className="print-sheets">
          {SHEETS.map((sheet) => (
            <PrintSheet key={sheet.id} sheet={sheet} />
          ))}
        </div>
        <AdSlot name="printable-below-sheets" />
        <div className="info-body kw-body">
          <section>
            <h2>Using the printable sheets</h2>
            <p>Every sheet has four grids that grow in size. In each grid one picture differs from the rest by a few pixels – a color that changed or a dot that went missing. Ask players to circle the odd picture and write how long it took.</p>
            <p>Prefer playing on screen? The <Link href="/">online spot the difference</Link> puzzles race you against an AI, and the <Link href="/for-kids">kids version</Link> uses the same big 3×3 grids as Sheet 1.</p>
          </section>
          <section>
            <h2>Frequently asked questions</h2>
            <div className="faq-list">
              {FAQ.map((item) => (
                <details key={item.q} className="card faq-item">
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </SiteShell>
  );
}
