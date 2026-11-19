import * as React from "react";
import { AppleLogoIcon, ArrowsLeftRightIcon, EnvelopeSimpleIcon, PhoneIcon, VaultIcon, WebhooksLogoIcon } from "@phosphor-icons/react/ssr";

import { Cta } from "@/components/blocks/cta";
import { Faq, type Question } from "@/components/blocks/faq";
import { FeatureGrid, type Feature } from "@/components/blocks/feature-grid";
import { Hero } from "@/components/blocks/hero";
import { LogosStrip } from "@/components/blocks/logos-strip";
import { Testimonial } from "@/components/blocks/testimonial";
import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";

export const HOME_FEATURES: Feature[] = [
  { icon: <EnvelopeSimpleIcon weight="fill" />, title: "Email", description: "Every agent gets an inbox of its own, with custom domains and signatures." },
  { icon: <PhoneIcon weight="fill" />, title: "Phone", description: "A dedicated number for calls and texts, with included minutes and messages." },
  { icon: <AppleLogoIcon weight="fill" />, title: "iMessage", description: "Reach people where they already text, on shared or dedicated lines." },
  { icon: <ArrowsLeftRightIcon weight="regular" />, title: "Agent2Agent", description: "Delegate work to any agent over the open A2A protocol." },
  { icon: <VaultIcon weight="fill" />, title: "Vault", description: "Keep the credentials your agents use in one zero-knowledge vault." },
  { icon: <WebhooksLogoIcon weight="regular" />, title: "Webhooks", description: "Send events to your HTTPS endpoints the moment a message lands." },
];

export const HOME_QUESTIONS: Question[] = [
  { question: "What is an agent identity?", answer: "An identity gives one agent its own handle, inbox, phone number and Agent Card, so people and other agents can reach it directly." },
  { question: "Can I use my own domain?", answer: "Yes. Paid plans add custom email domains, so your agents send and receive from your own address." },
  { question: "Is there a free plan?", answer: "Yes. The free plan includes three agent identities, an email inbox each and an agent-to-agent channel." },
];

/** The home page: hero, a names strip, the channels as features, a quote, questions and the closing call. */
function HomePage({
  markSrc,
  heroImage = "/octopus.png",
  title = "Give every AI agent a way to be reached",
  description = "Email, phone, iMessage and Agent2Agent for your agents, with contacts, notes and a vault they share.",
  customers = ["Acme", "Acme Labs", "Acme Cloud", "Acme Health", "Acme Pay"],
  features = HOME_FEATURES,
  questions = HOME_QUESTIONS,
}: { markSrc?: string; heroImage?: string; title?: string; description?: string; customers?: string[]; features?: Feature[]; questions?: Question[] }) {
  return (
    <SiteLayout markSrc={markSrc}>
      <Hero
        eyebrow="Agent2Agent ships today"
        title={title}
        description={description}
        actions={
          <>
            <Button asChild>
              <a href="/signup">Get started free</a>
            </Button>
            <Button asChild variant="outline">
              <a href="/docs">Read the docs</a>
            </Button>
          </>
        }
        media={
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroImage} alt="" width={640} height={566} className="mx-auto h-auto w-full max-w-56 lg:max-w-80" />
        }
      />
      <LogosStrip label="Teams building on it" names={customers} />
      <FeatureGrid label="Channels" title="One identity, every way to reach it" description="Turn on the channels each agent needs. They share contacts, notes and a vault." features={features} />
      <Testimonial quote="Our agents answer their own email now. Setup took an afternoon." role="Head of operations" company="Acme" />
      <Faq questions={questions} />
      <Cta
        title="Create your first agent"
        description="Set up an identity to unlock mailbox, phone and vault features."
        actions={
          <Button asChild>
            <a href="/signup">Get started free</a>
          </Button>
        }
        media={
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroImage} alt="" width={160} height={142} className="h-auto w-40" />
        }
      />
    </SiteLayout>
  );
}

export { HomePage };
