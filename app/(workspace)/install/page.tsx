import type { Metadata } from "next";

import { PageHeader } from "@/components/common/surfaces";
import { Card, QHead } from "@/components/stats/blocks";
import { CopyBlock } from "@/components/stats/copy-block";
import { LinkSiteForm } from "@/components/stats/link-site-form";
import { getStatsSite } from "@/services/stats";

export const metadata: Metadata = { title: "Install" };

const BOT_ENDPOINT = "https://stats.toodip.com/api/bot";

/**
 * Crawlers do not run page scripts, so the tracker never sees them. The site's
 * server reports each AI crawler hit instead: POST {id, bot, path} to the bot
 * endpoint (toodip-stats/api/bot.js). This is the Vercel/Next.js version.
 */
function botMiddleware(siteId: string): string {
  return `// middleware.ts at the project root (Next.js 16: name it proxy.ts and export "proxy")
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const AI_BOTS =
  /GPTBot|OAI-SearchBot|ChatGPT-User|PerplexityBot|ClaudeBot|anthropic-ai|CCBot|Google-Extended|Applebot-Extended|Bytespider/i;

export function middleware(request: NextRequest, event: NextFetchEvent) {
  const bot = request.headers.get("user-agent")?.match(AI_BOTS)?.[0];
  if (bot) {
    event.waitUntil(
      fetch("${BOT_ENDPOINT}", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "${siteId}", bot, path: request.nextUrl.pathname }),
      }).catch(() => {}),
    );
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/|.*\\\\..*).*)"] };`;
}

function botCurl(siteId: string): string {
  return `curl -X POST ${BOT_ENDPOINT} \\
  -H "Content-Type: application/json" \\
  -d '{"id":"${siteId}","bot":"GPTBot","path":"/"}'`;
}

export default async function InstallPage() {
  const site = await getStatsSite();
  const snippet = site
    ? `<script defer src="https://stats.toodip.com/s.js" data-id="${site.id}"></script>`
    : "";
  return (
    <>
      <PageHeader title="Install" description="The code to paste into the website." />
      {!site ? (
        <>
          <QHead step={1} title="Which website are we measuring?" sub="Enter the address. If the site already existed in stats, its data is linked." />
          <Card>
            <LinkSiteForm />
          </Card>
        </>
      ) : (
        <>
          <QHead step={1} title="Tracker" sub="Paste right before </head>." hint="Counts people and conversions. AI crawlers are counted on the server, see step 3." />
          <Card>
            <CopyBlock text={snippet} />
          </Card>
          <QHead step={2} title="Custom events (optional)" sub="A button with the data-toodip attribute, or a call from code." />
          <Card>
            <CopyBlock text={`<a href="/book" data-toodip="reservation">Book a table</a>\n\n<script>window.toodip && window.toodip('reservation');</script>`} />
            <p className="mt-3 text-[13px] text-muted-foreground">
              Names starting with <code>see_</code> count as engagement (section reached), not as conversions.
            </p>
          </Card>
          <QHead
            step={3}
            title="AI crawlers (optional)"
            sub="A small server-side hook, added by whoever maintains the site. It feeds the AI Bots page."
            hint="GPTBot, ClaudeBot, PerplexityBot and the others do not run page scripts, so the tracker in step 1 never sees them. The server has to report them."
          />
          <Card>
            <p className="text-[13px] text-muted-foreground">
              When a request&apos;s User-Agent matches an AI crawler, the server sends one POST with JSON{" "}
              <code>{`{"id":"<site id>","bot":"<matched name>","path":"<request path>"}`}</code> to{" "}
              <code>{BOT_ENDPOINT}</code>. The endpoint answers 204 and needs no key; a failed report can be
              ignored. On Vercel with Next.js, this file does it:
            </p>
            <div className="mt-3">
              <CopyBlock text={botMiddleware(site.id)} />
            </div>
            <p className="mt-4 text-[13px] text-muted-foreground">
              Other stacks: do the same in whatever runs before the page is served (an Express or Fastify
              middleware, a PHP or WordPress hook, an Nginx or Cloudflare Worker rule). Match the User-Agent
              header against the bot names above and send the same JSON from the server, one request per
              matched hit. The id for this site is <code>{site.id}</code>. This is the whole payload:
            </p>
            <div className="mt-3">
              <CopyBlock text={botCurl(site.id)} />
            </div>
          </Card>
        </>
      )}
    </>
  );
}
