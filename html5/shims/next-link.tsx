import type { AnchorHTMLAttributes } from "react";
/** HTML5 package shim: no Next router. The package never renders links in ng/y8 builds. */
export default function Link(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />;
}
