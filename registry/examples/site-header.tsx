import { SiteHeader } from "@/components/blocks/site-header";
import { Lockup } from "@/components/site/lockup";
import { Button } from "@/components/ui/button";

export function Preview() {
  return (
    <SiteHeader
      logo={<Lockup />}
      links={[
        { label: "Product", href: "#product", current: true },
        { label: "Pricing", href: "#pricing" },
        { label: "Changelog", href: "#changelog" },
        { label: "Blog", href: "#blog" },
      ]}
      actions={
        <>
          <Button variant="ghost" size="sm">
            Log in
          </Button>
          <Button size="sm">Get started</Button>
        </>
      }
    />
  );
}
