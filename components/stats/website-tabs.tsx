import { Suspense } from "react";

import { PageTabs } from "@/components/panel/page-tabs";
import { WEBSITE_TABS } from "@/lib/nav";

/** The four views of the website module, as tabs under the page title. */
export function WebsiteTabs() {
  return (
    <Suspense fallback={<div className="mb-6 h-[41px] border-b border-border" />}>
      <PageTabs tabs={WEBSITE_TABS} label="Website views" />
    </Suspense>
  );
}
