import { PricingTable } from "@/components/blocks/pricing-table";
import { PLANS } from "@/components/site/pricing-page";

export function Preview() {
  return <PricingTable label="Pricing" title="Start free, grow with your agents" plans={PLANS.slice(0, 3)} />;
}
