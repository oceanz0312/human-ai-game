import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";
import { PrintButton } from "@/components/site/PrintButton";
import { AdSlot } from "@/components/site/AdSlot";
import { PrintSheet } from "@/games/spot-the-difference/quick/PrintSheet";
import { SHEETS } from "@/content/printables";
import { breadcrumbLd, faqLd, JsonLd } from "@/seo/jsonld";
import { pageMetadata } from "@/lib/page-meta";

const PATH = "/printable";
const TITLE = "Spot the Difference Printable – Free Sheets with Answers | Spot The Difference Game";
const DESCRIPTION = "Free spot the difference printables with answer keys: easy, classic, Halloween, Thanksgiving, Christmas and winter sheets. Print or save as PDF for home or class.";

export const generateMetadata = () => pageMetadata("en", PATH, { title: TITLE, description: DESCRIPTION });


const FAQ = [
  { q: "How do I print these puzzles?", a: "Tap Print puzzles (or use your browser's print menu). Each sheet starts on a new page; choose Save as PDF to keep a copy." },
  { q: "Where are the answers?", a: "Each sheet ends with an answer key giving the row and column of the odd picture." },
  { q: "Can I use them in a classroom?", a: "Yes. The sheets are free for personal and classroom use." },
];

/** Christmas sheet intro (哥飞-reviewed final copy, ~90 words; screen only, hidden in print). Names no sprites on purpose. */
const CHRISTMAS_INTRO = (
  <p>
    This Christmas spot the difference printable has four grids of pixel-art holiday pictures. In each grid, one picture is a little different — circle the odd one out. The grids get bigger as you go, so younger kids can start easy and older kids get a real challenge. The answer key at the bottom lists each answer by row and column, so kids can check their own work. It&apos;s free for home and classroom use: print it or save it as a PDF. Rather play on a screen? Try the{" "}
    <Link href="/christmas">online Christmas spot the difference</Link> and race the AI.
  </p>
);

/** Printable spot the difference: real print-ready SVG sheets + answer keys (print CSS hides site chrome). */
export default function Page() {
  return (
    <SiteShell locale="en" path={PATH}>
      <JsonLd data={[breadcrumbLd("en", [{ name: "Home", path: "/" }, { name: "Printable", path: PATH }]), faqLd(FAQ)]} />
      <div className="container kw-page printable-page">
        <section className="kw-hero kw-hero-print">
          <div className="kw-head">
            <h1 className="page-title kw-title">Spot the Difference Printable</h1>
            <p className="kw-lede">Six free sheets – easy, classic, Halloween, Thanksgiving, Christmas and winter – with an answer key. Print them or save as PDF.</p>
            <div className="kw-cta">
              <PrintButton />
            </div>
          </div>
        </section>
        <nav className="print-toc" aria-label="Sheets" data-testid="print-toc">
          <span>Jump to:</span>
          {SHEETS.map((sheet) => (
            <a key={sheet.id} href={`#${sheet.id}`}>
              {sheet.toc}
            </a>
          ))}
        </nav>
        <div className="print-sheets">
          {SHEETS.map((sheet) => (
            <PrintSheet key={sheet.id} sheet={sheet} intro={sheet.id === "christmas" ? CHRISTMAS_INTRO : undefined} />
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
