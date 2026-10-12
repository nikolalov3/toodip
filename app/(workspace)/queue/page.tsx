import { redirect } from "next/navigation";

/** Retired module: the panel is the analytics product now. */
export default function RetiredPage() {
  redirect("/overview");
}
