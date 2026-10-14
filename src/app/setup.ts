import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/auth";

/** The logged-in owner's shop; otherwise the login screen (name, shop name, mobile). */
export async function requireOwner() {
  const session = await getOwnerSession();
  if (session) return session;
  redirect("/login");
}
