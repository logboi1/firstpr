import {ContributionList} from "@/components/contribution-list";
export const dynamic="force-dynamic";
export const metadata={title:"My pull requests — FirstPR"};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){return <ContributionList params={await searchParams}/>;}
