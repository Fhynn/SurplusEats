import { CalendarDays, FileCheck2 } from "lucide-react";

import { PublicSiteShell } from "@/components/public-site-shell";

export type LegalSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export function LegalDocumentPage({
  activeHref,
  eyebrow,
  title,
  description,
  sections,
}: Readonly<{
  activeHref: "/kebijakan-privasi" | "/syarat-ketentuan";
  eyebrow: string;
  title: string;
  description: string;
  sections: LegalSection[];
}>) {
  return (
    <PublicSiteShell activeHref={activeHref}>
      <main>
        <section className="border-b border-emerald-100 bg-emerald-50/70">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="flex items-center gap-2 text-xs font-extrabold tracking-[0.18em] text-emerald-700 uppercase">
              <FileCheck2 size={17} />
              {eyebrow}
            </div>
            <h1 className="mt-4 max-w-3xl text-3xl leading-tight font-extrabold tracking-tight text-gray-950 sm:text-4xl">
              {title}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 font-medium text-gray-600 sm:text-base">
              {description}
            </p>
            <p className="mt-6 flex items-center gap-2 text-xs font-bold text-gray-500">
              <CalendarDays size={16} className="text-emerald-600" />
              Berlaku dan terakhir diperbarui: 13 Juni 2026
            </p>
          </div>
        </section>

        <div className="mx-auto grid w-full min-w-0 max-w-6xl gap-10 overflow-hidden px-4 py-10 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:overflow-visible lg:px-8 lg:py-14">
          <aside className="min-w-0 lg:sticky lg:top-32 lg:h-fit">
            <p className="mb-3 text-xs font-extrabold tracking-[0.14em] text-gray-400 uppercase">
              Daftar Isi
            </p>
            <nav
              aria-label={`Daftar isi ${title}`}
              className="flex w-full max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] lg:flex-col lg:overflow-visible [&::-webkit-scrollbar]:hidden"
            >
              {sections.map((section, index) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="inline-flex min-h-11 shrink-0 items-center rounded-xl px-3 py-2 text-xs leading-5 font-bold text-gray-600 transition-colors hover:bg-white hover:text-emerald-700"
                >
                  {index + 1}. {section.title}
                </a>
              ))}
            </nav>
          </aside>

          <article className="min-w-0">
            {sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-36 border-b border-gray-200 py-8 first:pt-0 last:border-b-0"
              >
                <p className="text-xs font-extrabold text-emerald-600">
                  Bagian {index + 1}
                </p>
                <h2 className="mt-2 text-xl font-extrabold tracking-tight text-gray-950 sm:text-2xl">
                  {section.title}
                </h2>
                <div className="mt-4 max-w-3xl space-y-4 text-sm leading-7 font-medium text-gray-700 sm:text-base">
                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.bullets ? (
                    <ul className="space-y-3 pl-5">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="list-disc pl-1">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </section>
            ))}
          </article>
        </div>
      </main>
    </PublicSiteShell>
  );
}
