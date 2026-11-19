import { SiteLayout } from "@/components/site/site-layout";

export function Preview() {
  return (
    <SiteLayout current="/product">
      <section className="mx-auto max-w-(--ds-layout-column) px-6 py-16">
        <p className="text-body text-fg-secondary">The page's sections go here.</p>
      </section>
    </SiteLayout>
  );
}
