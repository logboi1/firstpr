import Image from "next/image";
import Link from "next/link";

/** The branch joins the first commit: one mark shared by the app and favicon. */
export function Brand() {
  return <Link className="wordmark" href="/" aria-label="FirstPR home"><Image src="/brand/firstpr-mark.svg" alt="" width={40} height={40} priority/><span>first<span className="wordmark-pr">pr</span><span className="wordmark-period" aria-hidden="true">.</span></span></Link>;
}
