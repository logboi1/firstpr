export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account-shell";
import { SignInForms } from "@/components/auth-forms";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
export default async function SignIn() {
  const configured = !!supabaseConfig();
  if (configured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect("/dashboard");
  }
  return <AccountShell><section className="account-card"><p className="eyebrow">YOUR FIRST STEP</p><h1>Welcome to FirstPR.</h1><p>Sign in or create an account with an email code. No password needed.</p>{configured ? <SignInForms/> : <p role="status">Sign-in is not configured yet. The maintainer needs to connect Supabase before you can create an account.</p>}</section></AccountShell>;
}
