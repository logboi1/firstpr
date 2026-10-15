import {DirectoryShell} from "@/components/directory-shell";
export default function Layout({children}:{children:React.ReactNode}){return <DirectoryShell active="progress">{children}</DirectoryShell>;}
