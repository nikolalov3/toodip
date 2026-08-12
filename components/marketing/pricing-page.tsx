import { Check } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { CONTACT_EMAIL } from "@/components/marketing/contact-form";
import { LocaleSwitch } from "@/components/marketing/locale-switch";
import { buttonVariants } from "@/components/ui/button";
import { PLANS, formatEur, type PlanDefinition } from "@/lib/billing";
import {
  fill,
  localePrefix,
  type MarketingDict,
  type MarketingLocale,
} from "@/lib/marketing-i18n";
import { cn } from "@/lib/utils";

/** The pricing page body, one per locale. Plan copy comes from the dict. */

function PlanCard({
  plan,
  dict,
  highlight,
}: {
  plan: PlanDefinition;
  dict: MarketingDict;
  highlight?: boolean;
}) {
  const copy = dict.plans[plan.id as keyof MarketingDict["plans"]];
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-lg border border-border bg-card p-5",
        highlight && "border-brand/40 ring-1 ring-brand/20",
      )}
    >
      {plan.trialDays ? (
        <span className="absolute -top-2.5 right-4 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-semibold text-brand-foreground">
          {fill(dict.pricing.trialBadge, { n: String(plan.trialDays) })}
        </span>
      ) : null}
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">{plan.name}</h3>
        <p className="text-numeric text-sm">
          {plan.priceCents === 0
            ? dict.pricing.free
            : `${formatEur(plan.priceCents)} ${dict.pricing.perMonth}`}
        </p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{copy.blurb}</p>
      <ul className="mt-4 flex flex-1 flex-col gap-1.5">
        {copy.features.map((feature) => (
          <li key={feature} className="flex gap-1.5 text-xs">
            <Check className="mt-0.5 size-3 shrink-0 text-positive" />
            <span className="text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/sign-up"
        className={buttonVariants({
          size: "sm",
          variant: highlight ? "default" : "outline",
          className: "mt-5",
        })}
      >
        {plan.priceCents === 0
          ? dict.pricing.startFree
          : dict.pricing.startUpgrade}
      </Link>
    </div>
  );
}

export function PricingPage({
  dict,
  locale,
}: {
  dict: MarketingDict;
  locale: MarketingLocale;
}) {
  const prefix = localePrefix(locale);
  const replyLine = [PLANS.free, PLANS.starter, PLANS.pro];
  const visibilityLine = [PLANS.visibility, PLANS.unlimited];

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link href={prefix || "/"}>
          <Logo size={28} wordmarkClassName="text-base" />
        </Link>
        <nav className="flex items-center gap-2">
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

      <main className="mx-auto max-w-5xl px-6 pb-16">
        <section className="py-10">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {dict.pricing.title}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {dict.pricing.intro}
          </p>
        </section>

        <section className="border-t border-border py-10">
          <h2 className="text-base font-semibold tracking-tight">
            {dict.pricing.replyTitle}
          </h2>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground">
            {dict.pricing.replyIntro}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {replyLine.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                dict={dict}
                highlight={plan.id === "pro"}
              />
            ))}
          </div>
        </section>

        <section className="border-t border-border py-10">
          <h2 className="text-base font-semibold tracking-tight">
            {dict.pricing.visTitle}
          </h2>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground">
            {dict.pricing.visIntro}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {visibilityLine.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                dict={dict}
                highlight={plan.id === "visibility"}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {dict.pricing.proNote}
          </p>
        </section>

        <section className="border-t border-border py-10">
          <h2 className="text-base font-semibold tracking-tight">
            {dict.pricing.faqTitle}
          </h2>
          <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {dict.pricing.faq.map((item) => (
              <div key={item.q}>
                <h3 className="text-sm font-medium">{item.q}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {fill(item.a, { email: CONTACT_EMAIL })}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-6">
          <Logo size={22} wordmarkClassName="text-sm" />
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <LocaleSwitch current={locale} path="/pricing" />
            <span>
              {dict.footer.product} · {CONTACT_EMAIL}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
