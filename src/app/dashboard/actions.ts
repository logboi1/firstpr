"use server";
import {revalidatePath} from "next/cache";
import {createClient} from "@/lib/supabase/server";
import {supabaseConfig} from "@/lib/supabase/config";
import {consentInput} from "@/lib/progress/validation";
import type {FormState} from "@/lib/auth/validation";
export async function setPublicConsent(_previous:FormState,form:FormData):Promise<FormState>{
  const enabled=consentInput.safeParse(form.get("enabled"));
  if(!enabled.success)return {error:"That visibility setting is invalid. Refresh and try again."};
  try{
    if(!supabaseConfig())return {error:"Sign in to change your visibility."};
    const supabase=await createClient();const {data:auth,error:authError}=await supabase.auth.getUser();
    if(authError||!auth.user)return {error:"Your session has expired. Sign in again."};
    const {data,error}=await supabase.from("profiles").update({public_board_consent:enabled.data==="true"}).eq("id",auth.user.id).select("id").single();
    if(error||!data)return {error:"Your visibility could not be saved. Try again."};
  }catch{return {error:"We could not reach the account service. Try again."};}
  revalidatePath("/dashboard");revalidatePath("/profile");revalidatePath("/progress");
  return {message:enabled.data==="true"?"Your contributions are now visible on the public board.":"Your contributions are now private and excluded from new public board requests."};
}
