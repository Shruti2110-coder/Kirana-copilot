import { redirect } from "next/navigation";
import { getShop } from "@/lib/db";
import { getOwnerSession } from "@/lib/auth";

/**
 * The logged-in owner's shop. No owner yet: the welcome screen sets one up.
 * Owner exists but this browser isn't logged in: the phone login screen.
 */
export async function requireOwner() {
  const session = await getOwnerSession();
  if (session) return session;
  const shop = await getShop();
  redirect(shop.onboarded ? "/login" : "/welcome");
}
