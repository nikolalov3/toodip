import type { Metadata } from "next";

import { PageHeader } from "@/components/common/surfaces";
import { Card, QHead } from "@/components/stats/blocks";
import { CopyBlock } from "@/components/stats/copy-block";
import { LinkSiteForm } from "@/components/stats/link-site-form";
import { getStatsSite } from "@/services/stats";

export const metadata: Metadata = { title: "Install" };

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
          <QHead step={1} title="Tracker" sub="Paste right before </head>." hint="Counts people and conversions. AI bots need the middleware in addition; set up separately." />
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
        </>
      )}
    </>
  );
}
