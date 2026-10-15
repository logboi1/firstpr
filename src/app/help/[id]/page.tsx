import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { requestId } from "@/lib/help/validation";
import { parseQueue,requestSchema } from "@/lib/mentor/validation";
import { HelpRequestDetail } from "@/components/help-request-detail";
export const dynamic="force-dynamic";
export const metadata={title:"My request and guidance — FirstPR"};
export default async function Request({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const {supabase}=await requireProfile();
  const {id}=await params;
  if(!requestId.safeParse(id).success) notFound();
  const {page}=parseQueue(await searchParams);
  // Explicit participant view remains own-only, including for mentors.
  const {data,error}=await supabase.rpc("get_help_request",{wanted:id,mentor_view:false,response_page:page});
  if(error) throw new Error("Your request could not be loaded.");
  if(!data) notFound();
  return <HelpRequestDetail request={requestSchema.parse(data)}/>;
}
