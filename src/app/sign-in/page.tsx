export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account-shell";
import { GitHubSignInButton } from "@/components/auth-forms";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const configured = !!supabaseConfig();
  if (configured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect("/dashboard");
  }
  return (
    <AccountShell publicNavigation>
      <section className="account-card">
        <p className="eyebrow">YOUR FIRST STEP</p>
        <h1>Welcome to FirstPR.</h1>
        <p>Sign in or create an account with your GitHub account.</p>
        {error === "oauth" && (
          <p className="form-error" role="alert">
            GitHub sign-in could not be completed. Please try again.
          </p>
        )}
        {configured ? (
          <GitHubSignInButton />
        ) : (
          <p role="status">
            Sign-in is not configured yet. The maintainer needs to connect
            Supabase before you can create an account.
          </p>
        )}
      </section>
    </AccountShell>
  );
}
