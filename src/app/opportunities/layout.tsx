import { DirectoryShell } from "@/components/directory-shell";
export default function DirectoryLayout({ children }: { children: React.ReactNode }) {
  return <DirectoryShell>{children}</DirectoryShell>;
}
