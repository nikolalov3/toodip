import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleCheck,
  Copy,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { DM_Mono, Instrument_Serif, Manrope } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";

import { CONTACT_EMAIL } from "@/components/marketing/contact-form";
import { LocaleSwitch } from "@/components/marketing/locale-switch";
import { PLANS, formatEur, type PlanDefinition } from "@/lib/billing";
import {
  fill,
  localePrefix,
  type MarketingDict,
  type MarketingLocale,
} from "@/lib/marketing-i18n";
import { cn } from "@/lib/utils";

import "@/app/landing.css";

/**
 * Evidence Atelier: the landing as an editorial dossier. Ink, paper, Signal
 * Blue, asymmetric structure, data as the argument. One component per locale;
 * every string comes from the dict, plan facts come from lib/billing so the
 * page can never disagree with checkout.
 */

const manrope = Manrope({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-manrope",
});
const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin", "latin-ext"],
  variable: "--font-dm-mono",
});
const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-instrument-serif",
});

const SHARE_ROWS = [
  { width: "28%", tone: "gray", value: "28%" },
  { width: "46%", tone: "soft", value: "46%" },
  { width: "68%", tone: "blue", value: "68%" },
] as const;

const SOURCE_DOTS = ["dot-blue", "dot-navy", "dot-muted"] as const;

function PlanCard({
  plan,
  dict,
  eyebrow,
  cta,
  featured,
}: {
  plan: PlanDefinition;
  dict: MarketingDict;
  eyebrow: string;
  cta: string;
  featured?: boolean;
}) {
  const copy = dict.plans[plan.id as keyof MarketingDict["plans"]];
  return (
    <article className={cn("plan-card", featured && "plan-card-featured")}>
      <div className="plan-card-top">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{plan.name}</h3>
        </div>
        <div className="price-block">
          <strong>
            {plan.priceCents === 0 ? dict.pricing.free : formatEur(plan.priceCents)}
          </strong>
          {plan.priceCents > 0 && <span>{dict.pricing.perMonth}</span>}
        </div>
      </div>
      <p className="plan-note">{copy.blurb}</p>
      <ul className="plan-features">
        {copy.features.map((feature) => (
          <li key={feature}>
            <Check size={15} strokeWidth={2.4} />
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href="/sign-up"
        className={cn("plan-cta", featured && "plan-cta-solid")}
      >
        {cta}
        <ArrowUpRight size={16} />
      </Link>
    </article>
  );
}

export function LandingPage({
  dict,
  locale,
}: {
  dict: MarketingDict;
  locale: MarketingLocale;
}) {
  const prefix = localePrefix(locale);
  const t = dict.landing;
  const replyLine = [PLANS.free, PLANS.starter, PLANS.pro];
  const visibilityLine = [PLANS.visibility, PLANS.unlimited];

  return (
    <div
      className={cn(
        "site-shell",
        manrope.variable,
        dmMono.variable,
        instrumentSerif.variable,
      )}
    >
      <header className="site-header">
        <a className="brand" href="#top" aria-label="toodip">
          <Image
            src="/landing/signal-mark.png"
            alt=""
            width={31}
            height={31}
            priority
          />
          <span>toodip</span>
        </a>
        <nav className="main-nav" aria-label="Main">
          <a href="#reply-assistant">Reply Assistant</a>
          <a href="#visibility">{t.navVisibility}</a>
          <a href="#pricing">{dict.nav.pricing}</a>
        </nav>
        <div className="nav-actions">
          <Link className="sign-in" href="/sign-in">
            {dict.nav.signIn}
          </Link>
          <Link className="button button-small" href="/sign-up">
            {dict.nav.startFree} <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>

      <main id="top">
        <section className="hero section-grid">
          <div className="section-rail hero-rail">
            <span>00</span>
            <i />
          </div>
          <div className="hero-copy reveal">
            <div className="kicker">
              <span className="signal-dot" />
              {t.kicker}
            </div>
            <h1>
              {t.hero.pre}
              <em>{t.hero.em}</em>
              {t.hero.post}
            </h1>
            <p className="hero-lead">{t.lead}</p>
            <div className="hero-actions">
              <Link className="button" href="/sign-up">
                {t.ctaMeasure} <ArrowRight size={18} />
              </Link>
              <a className="text-link" href="#reply-assistant">
                {t.ctaReply} <ArrowUpRight size={16} />
              </a>
            </div>
            <div className="hero-proof">
              {t.proof.map((item) => (
                <div key={item.label}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-visual reveal reveal-delay">
            <div className="hero-image-wrap">
              <Image
                className="hero-image"
                src="/landing/hero-signal-field.png"
                alt=""
                fill
                sizes="(max-width: 780px) 92vw, 47vw"
                priority
              />
              <div className="hero-image-wash" />
            </div>
            <div className="measurement-card">
              <div className="measurement-head">
                <span className="mini-label">{t.card.label}</span>
                <span className="live-pill">
                  <i /> {t.card.live}
                </span>
              </div>
              <p>{t.card.question}</p>
              <div className="measure-lines">
                {t.card.rows.map((label, index) => {
                  const widths = ["72%", "88%", "41%"];
                  const values = ["72", "88", "41"];
                  return (
                    <div key={label}>
                      <span>{label}</span>
                      <b className="bar">
                        <i style={{ width: widths[index] }} />
                      </b>
                      <em>{values[index]}</em>
                    </div>
                  );
                })}
              </div>
              <div className="measurement-foot">
                <span>{t.card.foot}</span>
                <strong>{t.card.delta}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="marquee-strip" aria-hidden>
          <div className="marquee-inner">
            {[...t.marquee, ...t.marquee].map((item, index) => (
              <Fragment key={`${item}-${index}`}>
                <span>{item}</span>
                <i />
              </Fragment>
            ))}
          </div>
        </section>

        <section id="visibility" className="evidence section-grid section-pad">
          <div className="section-rail">
            <span>01</span>
            <i />
          </div>
          <div className="section-intro">
            <p className="eyebrow">{t.vis.eyebrow}</p>
            <h2>
              {t.vis.title.pre}
              <span className="blue-phrase">{t.vis.title.blue}</span>
            </h2>
            <p>{t.vis.body}</p>
          </div>
          <div className="evidence-board">
            <article className="evidence-card evidence-card-wide">
              <div className="card-topline">
                <span className="mini-label">{t.vis.shareLabel}</span>
                <span className="metric-positive">+12,4%</span>
              </div>
              <div className="share-chart">
                {t.vis.shareRows.map((label, index) => {
                  const row = SHARE_ROWS[index];
                  const strong = index === t.vis.shareRows.length - 1;
                  return (
                    <div key={label} className="share-row" style={{ display: "contents" }}>
                      <div className={cn("chart-label", strong ? "chart-strong" : "chart-muted")}>
                        {label}
                      </div>
                      <div className="chart-rail">
                        <i
                          className={cn("chart-fill", row.tone)}
                          style={{ width: row.width }}
                        />
                      </div>
                      <span className={cn(strong && "chart-strong")}>{row.value}</span>
                    </div>
                  );
                })}
              </div>
              <p className="card-caption">{t.vis.shareNote}</p>
            </article>
            <article className="evidence-card source-card">
              <div className="card-topline">
                <span className="mini-label">{t.vis.srcLabel}</span>
                <ScanSearch size={18} />
              </div>
              <div className="source-list">
                {t.vis.srcRows.map((row, index) => (
                  <div key={row.name}>
                    <span className={cn("source-mark", SOURCE_DOTS[index])} />
                    {row.name} <strong>{row.verdict}</strong>
                  </div>
                ))}
              </div>
              <p className="card-caption">{t.vis.srcNote}</p>
            </article>
            <article className="evidence-card intervention-card">
              <p className="eyebrow">{t.vis.logEyebrow}</p>
              <h3>
                {t.vis.logTitle.pre}
                <br />
                <em>{t.vis.logTitle.em}</em>
              </h3>
              <div className="intervention-line">
                <span /> <b /> <i /> <em />
              </div>
              <div className="intervention-key">
                {t.vis.logKeys.map((key) => (
                  <span key={key}>{key}</span>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section
          id="reply-assistant"
          className="reply-section section-grid section-pad"
        >
          <div className="section-rail rail-light">
            <span>02</span>
            <i />
          </div>
          <div className="reply-copy">
            <p className="eyebrow eyebrow-light">{t.reply.eyebrow}</p>
            <div className="reply-title-row">
              <span className="reply-icon">
                <Sparkles size={18} />
              </span>
              <div>
                <span className="module-stamp">{t.reply.stamp}</span>
                <h2>
                  Reply
                  <br />
                  <span>Assistant</span>
                </h2>
              </div>
            </div>
            <p className="reply-lead">{t.reply.lead}</p>
            <ul className="reply-benefits">
              {t.reply.benefits.map((benefit) => (
                <li key={benefit}>
                  <CircleCheck size={18} />
                  {benefit}
                </li>
              ))}
            </ul>
            <Link className="button button-light" href="/sign-up">
              {t.reply.cta} <ArrowRight size={18} />
            </Link>
          </div>
          <div className="reply-stage">
            <Image
              className="reply-art"
              src="/landing/reply-assistant.png"
              alt=""
              fill
              sizes="(max-width: 780px) 92vw, 46vw"
            />
            <div className="reply-desk">
              <div className="desk-title">
                <span>{t.reply.deskLabel}</span>
                <div>
                  <i />
                  <i />
                  <i />
                </div>
              </div>
              <div className="review-quote">{t.reply.quote}</div>
              <div className="assistant-response">
                <div className="response-meta">
                  <span className="response-logo">
                    <Sparkles size={14} />
                  </span>
                  <span>TOODIP REPLY ASSISTANT</span>
                  <button aria-label={t.reply.copyAria} type="button">
                    <Copy size={13} />
                  </button>
                </div>
                <p>{t.reply.response}</p>
                <div className="response-tags">
                  {t.reply.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
              <div className="desk-footer">
                <span>
                  <ShieldCheck size={15} /> {t.reply.approval}
                </span>
                <b>1 / 1</b>
              </div>
            </div>
          </div>
        </section>

        <section className="source-story section-grid section-pad">
          <div className="section-rail">
            <span>03</span>
            <i />
          </div>
          <div className="source-art-wrap">
            <Image
              src="/landing/source-map.png"
              alt=""
              fill
              sizes="(max-width: 780px) 100vw, 44vw"
            />
            <span className="art-caption">{t.source.caption}</span>
          </div>
          <div className="source-copy">
            <p className="eyebrow">{t.source.eyebrow}</p>
            <h2>
              {t.source.title.pre}
              <span className="blue-phrase">{t.source.title.blue}</span>
            </h2>
            <p>{t.source.body}</p>
            <a className="text-link dark-link" href="#pricing">
              {t.source.cta} <ArrowRight size={16} />
            </a>
          </div>
        </section>

        <section id="pricing" className="pricing-section section-grid section-pad">
          <div className="section-rail">
            <span>04</span>
            <i />
          </div>
          <div className="pricing-head">
            <p className="eyebrow">{t.pricing.eyebrow}</p>
            <h2>
              {t.pricing.title.pre}
              <br />
              <span className="blue-phrase">{t.pricing.title.blue}</span>
            </h2>
            <p>{t.pricing.body}</p>
          </div>

          <div className="pricing-body">
            <div className="plan-group-heading">
              <div>
                <span className="group-number">A</span>
                <h3>{t.pricing.groupA.title}</h3>
              </div>
              <p>{t.pricing.groupA.note}</p>
            </div>
            <div className="plans-grid reply-plans">
              {replyLine.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  dict={dict}
                  eyebrow={
                    plan.id === "pro" ? t.pricing.mostPopular : t.pricing.groupA.title
                  }
                  cta={t.pricing.groupA.cta}
                  featured={plan.id === "pro"}
                />
              ))}
            </div>

            <div className="plan-group-heading visibility-heading">
              <div>
                <span className="group-number">B</span>
                <h3>{t.pricing.groupB.title}</h3>
              </div>
              <p>{t.pricing.groupB.note}</p>
            </div>
            <div className="plans-grid visibility-plans">
              {visibilityLine.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  dict={dict}
                  eyebrow={t.pricing.groupB.title}
                  cta={t.pricing.groupB.cta}
                  featured={plan.id === "visibility"}
                />
              ))}
            </div>
            <p className="pricing-footnote">{t.pricing.footnote}</p>
          </div>
        </section>

        <section className="faq-section section-grid section-pad">
          <div className="section-rail">
            <span>05</span>
            <i />
          </div>
          <div className="faq-title">
            <p className="eyebrow eyebrow-light">{t.faq.eyebrow}</p>
            <h2>
              {t.faq.title.pre}
              <br />
              <span className="blue-phrase">{t.faq.title.blue}</span>
            </h2>
          </div>
          <div className="faq-list">
            {dict.pricing.faq.slice(0, 4).map((item, index) => (
              <details key={item.q} open={index === 0}>
                <summary>
                  {item.q}
                  <ChevronDown size={18} />
                </summary>
                <p>{fill(item.a, { email: CONTACT_EMAIL })}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-main">
          <a className="brand brand-footer" href="#top">
            <Image src="/landing/signal-mark.png" alt="" width={37} height={37} />
            <span>toodip</span>
          </a>
          <p>{t.footer.tagline}</p>
        </div>
        <div className="footer-links">
          <a href="#reply-assistant">Reply Assistant</a>
          <a href="#visibility">{t.navVisibility}</a>
          <Link href={`${prefix}/pricing`}>{dict.nav.pricing}</Link>
        </div>
        <div className="footer-action">
          <Link className="text-link footer-link" href="/sign-up">
            {t.footer.cta} <ArrowUpRight size={16} />
          </Link>
          <div className="footer-meta">
            <span className="locale-switch">
              <LocaleSwitch current={locale} path="" />
            </span>
            <span>
              © 2026 toodip · {dict.footer.product} · {CONTACT_EMAIL}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
