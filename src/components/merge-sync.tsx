"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { syncMyContributions } from "@/app/contributions/actions";

export function MergeSync() {
  const router = useRouter();
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    let disposed = false, busy = false;
    const sync = async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const result = await syncMyContributions();
        if (!disposed) {
          setUnavailable(result.unavailable);
          if (result.completed > 0) router.refresh();
        }
      } catch { if (!disposed) setUnavailable(true); }
      finally { busy = false; }
    };
    void sync();
    const timer = setInterval(() => { void sync(); }, 300000);
    return () => { disposed = true; clearInterval(timer); };
  }, [router]);
  return unavailable ? <p className="field-hint" role="status">Automatic merge checking is temporarily unavailable. Your saved contributions are safe; try again later or ask a curator.</p> : null;
}
