import { SiteFooter } from "@/components/blocks/site-footer";
import { Lockup } from "@/components/site/lockup";
import { FOOTER_GROUPS } from "@/components/site/site-layout";

export function Preview() {
  return <SiteFooter logo={<Lockup />} tagline="Give every AI agent a way to be reached." groups={FOOTER_GROUPS} legal="© 2026 Inkbox" legalLinks={[{ label: "Privacy policy", href: "#privacy" }]} />;
}
