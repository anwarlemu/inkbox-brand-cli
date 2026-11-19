import { ArrowsLeftRightIcon, EnvelopeSimpleIcon, PhoneIcon } from "@phosphor-icons/react/ssr";

import { FeatureGrid } from "@/components/blocks/feature-grid";

export function Preview() {
  return (
    <FeatureGrid
      label="Channels"
      title="One identity, every way to reach it"
      features={[
        { icon: <EnvelopeSimpleIcon weight="fill" />, title: "Email", description: "Every agent gets an inbox of its own." },
        { icon: <PhoneIcon weight="fill" />, title: "Phone", description: "A dedicated number for calls and texts." },
        { icon: <ArrowsLeftRightIcon weight="regular" />, title: "Agent2Agent", description: "Delegate work to any agent over A2A.", href: "#a2a" },
      ]}
    />
  );
}
