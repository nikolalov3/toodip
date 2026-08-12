import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { getUserClient } from "@/lib/supabase/server";

/**
 * Lands Supabase email links: magic links, password recovery, invites. The
 * token in the URL is exchanged for a session server side, so the cookies are
 * set the same way the password sign-in action sets them. Sign-in stays
 * password based; this route exists for the email flows around it.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (tokenHash && type) {
    const supabase = await getUserClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      // Only ever redirect within the app, wherever the link came from.
      redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
    }
  }

  redirect("/sign-in?error=link");
}
