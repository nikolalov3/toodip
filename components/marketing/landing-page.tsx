import {
  ClipboardPaste,
  Eye,
  FileSearch,
  Radar,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { CONTACT_EMAIL, ContactForm } from "@/components/marketing/contact-form";
import { LocaleSwitch } from "@/components/marketing/locale-switch";
import { buttonVariants } from "@/components/ui/button";
import { PLANS, formatEur } from "@/lib/billing";
import {
  fill,
  localePrefix,
  type MarketingDict,
  type MarketingLocale,
} from "@/lib/marketing-i18n";
import { cn } from "@/lib/utils";

/**
 * The landing page body, one per locale. All copy comes from the dict; auth
 * routes stay unprefixed because the panel is English for now.
 */

const GATE_ICONS = [Eye, Radar, FileSearch];
const REPLY_ICONS = [ClipboardPaste, Sparkles, ShieldCheck];

const LEADERBOARD_MOCK = [
  { name: "Competitor A", share: 62, own: false },
  { name: "Competitor B", share: 41, own: false },
  { name: "you", share: 18, own: true },
  { name: "Competitor C", share: 12, own: false },
];

const SOURCES_MOCK = [
  { domain: "instagram.com", count: 71 },
  { domain: "krakow.com", count: 44 },
  { domain: "kukbuk.pl", count: 38 },
  { domain: "wanderlog.com", count: 26 },
  { domain: "your-venue.com", count: 0 },
];

export function LandingPage({
  dict,
  locale,
}: {
  dict: MarketingDict;
  locale: MarketingLocale;
}) {
  const prefix = localePrefix(locale);
  const competitorName = (index: number) =>
    `${dict.evidence.competitor} ${"ABC"[index] ?? ""}`.trim();

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Logo size={28} wordmarkClassName="text-base" />
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href={`${prefix}/pricing`}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            {dict.nav.pricing}
          </Link>
          <Link
            href="/sign-in"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            {dict.nav.signIn}
          </Link>
          <Link href="/sign-up" className={buttonVariants({ size: "sm" })}>
            {dict.nav.startFree}
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        {/* Hero */}
        <section className="py-16 sm:py-24">
          <p className="text-xs font-medium uppercase tracking-widest text-brand">
            {dict.hero.kicker}
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            {dict.hero.title}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {dict.hero.body}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/sign-up" className={buttonVariants({})}>
              {dict.hero.ctaMeasure}
            </Link>
            <Link
              href={`${prefix}/pricing`}
              className={buttonVariants({ variant: "outline" })}
            >
              {dict.hero.ctaPricing}
            </Link>
          </div>
        </section>

        {/* Dashboard evidence strip */}
        <section className="border-t border-border py-14" id="how">
          <h2 className="text-lg font-semibold tracking-tight">
            {dict.evidence.title}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {dict.evidence.body}
          </p>
          <div className="mt-6 grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-medium">{dict.evidence.sovTitle}</p>
              <ul className="mt-3 flex flex-col gap-2">
                {LEADERBOARD_MOCK.map((row, index) => (
                  <li
                    key={row.name}
                    className="flex items-center gap-2.5 text-xs"
                  >
                    <span
                      className={cn(
                        "w-24 shrink-0 truncate",
                        row.own
                          ? "font-semibold text-brand"
                          : "text-muted-foreground",
                      )}
                    >
                      {row.own ? dict.evidence.yourVenue : competitorName(index)}
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className={cn(
                          "block h-full rounded-full",
                          row.own ? "bg-brand" : "bg-muted-foreground/40",
                        )}
                        style={{ width: `${row.share}%` }}
                      />
                    </span>
                    <span className="text-numeric w-8 text-right text-muted-foreground">
                      {row.share}%
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-muted-foreground">
                {dict.evidence.sovNote}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-medium">{dict.evidence.sourcesTitle}</p>
              <ul className="mt-3 flex flex-col gap-2">
                {SOURCES_MOCK.map((row) => (
                  <li
                    key={row.domain}
                    className="flex items-center justify-between text-xs"
                  >
                    <span
                      className={cn(
                        row.domain === "your-venue.com"
                          ? "font-semibold text-critical"
                          : "text-muted-foreground",
                      )}
                    >
                      {row.domain}
                    </span>
                    <span className="text-numeric text-muted-foreground">
                      {row.count} {dict.evidence.citations}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-muted-foreground">
                {dict.evidence.sourcesNote}
              </p>
            </div>
          </div>
        </section>

        {/* Three gates */}
        <section className="border-t border-border py-14">
          <h2 className="text-lg font-semibold tracking-tight">
            {dict.gates.title}
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {dict.gates.items.map((gate, index) => {
              const Icon = GATE_ICONS[index] ?? Eye;
              return (
                <div key={gate.title}>
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-md border border-border bg-card text-brand">
                      <Icon className="size-4" />
                    </span>
                    <span className="text-numeric text-xs text-muted-foreground">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-medium">{gate.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {gate.body}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-8 flex items-start gap-3 rounded-lg border border-border bg-card p-4">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-brand">
              <TrendingUp className="size-3.5" />
            </span>
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">
                {dict.gates.interventionLead}
              </span>{" "}
              {dict.gates.interventionBody}
            </p>
          </div>
        </section>

        {/* Reply desk */}
        <section className="border-t border-border py-14">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-brand">
                {dict.reply.kicker}
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight">
                {dict.reply.title}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                {fill(dict.reply.body, {
                  price: formatEur(PLANS.starter.priceCents),
                })}
              </p>
              <Link
                href="/sign-up"
                className={cn(
                  buttonVariants({ size: "sm", variant: "outline" }),
                  "mt-5",
                )}
              >
                {dict.reply.cta}
              </Link>
            </div>
            <ul className="flex flex-col gap-3">
              {dict.reply.bullets.map((text, index) => {
                const Icon = REPLY_ICONS[index] ?? Sparkles;
                return (
                  <li key={text} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-brand">
                      <Icon className="size-3.5" />
                    </span>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {text}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Pricing teaser */}
        <section className="border-t border-border py-14">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-6">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                {fill(dict.teaser.title, {
                  reply: formatEur(PLANS.starter.priceCents),
                  visibility: formatEur(PLANS.visibility.priceCents),
                })}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {dict.teaser.body}
              </p>
            </div>
            <Link
              href={`${prefix}/pricing`}
              className={buttonVariants({ size: "sm" })}
            >
              {dict.teaser.cta}
            </Link>
          </div>
        </section>

        {/* Contact */}
        <section className="border-t border-border py-14" id="contact">
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                {dict.contact.title}
              </h2>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {fill(dict.contact.body, { email: CONTACT_EMAIL })}
              </p>
            </div>
            <ContactForm labels={dict.contact} />
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-6">
          <Logo size={22} wordmarkClassName="text-sm" />
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <LocaleSwitch current={locale} path="" />
            <Link href={`${prefix}/pricing`} className="hover:text-foreground">
              {dict.nav.pricing}
            </Link>
            <span>
              {dict.footer.product} · {CONTACT_EMAIL}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
