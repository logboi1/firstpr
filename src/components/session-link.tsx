import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";

async function ValidatedSessionLink() {
  let signedIn = false;
  if (supabaseConfig()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.getUser();
      signedIn = !error && !!data.user;
    } catch {
      return <Link className="nav-signin" href="/dashboard">My account →</Link>;
    }
  }
  return <Link className="nav-signin" href={signedIn ? "/dashboard" : "/sign-in"}>
    {signedIn ? "Dashboard" : "Sign in"} <span aria-hidden="true">→</span>
  </Link>;
}

export function SessionLink() {
  return <Suspense fallback={<span className="field-hint">Checking session…</span>}><ValidatedSessionLink/></Suspense>;
}
