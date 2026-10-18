import { AppLoading } from "@/components/app-loading";
import { AccountShell } from "@/components/account-shell";
export default function Loading() {
  return <AccountShell><AppLoading label="Loading your dashboard…"/></AccountShell>;
}
