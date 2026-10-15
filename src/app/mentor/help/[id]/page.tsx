import { notFound } from "next/navigation";
import { mentorRequest } from "@/lib/mentor/data";
import { requestId } from "@/lib/help/validation";
import { parseQueue } from "@/lib/mentor/validation";
import { HelpRequestDetail } from "@/components/help-request-detail";
export const dynamic="force-dynamic";
export const metadata={title:"Mentor request — FirstPR"};
export default async function Request({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const {id}=await params;
  if(!requestId.safeParse(id).success) notFound();
  const {page}=parseQueue(await searchParams);
  return <HelpRequestDetail mentor request={await mentorRequest(id,page)}/>;
}
