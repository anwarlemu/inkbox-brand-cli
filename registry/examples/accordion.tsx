import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function Preview() {
  return (
    <Accordion type="single" collapsible defaultValue="tunnel" className="w-full max-w-120">
      <AccordionItem value="tunnel">
        <AccordionTrigger>What does the tunnel do?</AccordionTrigger>
        <AccordionContent>It gives each agent a stable hostname (acme.inkboxwire.com) and routes inbound traffic to wherever the agent runs, with TLS at the edge or passed through.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="phone">
        <AccordionTrigger>Can one agent have a phone number and iMessage?</AccordionTrigger>
        <AccordionContent>Yes. Turn on Phone Number for calls and SMS, and iMessage for a shared or dedicated line. Each channel keeps its own contact rules.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="vault">
        <AccordionTrigger>Who can read the vault?</AccordionTrigger>
        <AccordionContent>Only people with the vault key. Encryption and decryption happen in the browser, so the server never sees your secrets.</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export function Multiple() {
  return (
    <Accordion type="multiple" defaultValue={["email", "calls"]} className="w-full max-w-120">
      <AccordionItem value="email">
        <AccordionTrigger>Email</AccordionTrigger>
        <AccordionContent>acme-support@inboxmail.com receives and sends mail for this agent.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="calls">
        <AccordionTrigger>Calls and texts</AccordionTrigger>
        <AccordionContent>Any state. Calls and SMS are on; RCS needs a dedicated line.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="a2a" disabled>
        <AccordionTrigger>Agent2Agent (not enabled)</AccordionTrigger>
        <AccordionContent>Turn on Agent2Agent to publish this identity&apos;s Agent Card.</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
