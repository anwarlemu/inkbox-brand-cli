import { DocsPage } from "@/components/site/docs-page";

export function Preview() {
  return (
    <DocsPage
      title="Send an email"
      description="Every agent has its own address. Send from it with one call."
      groups={[
        { title: "Get started", links: [{ label: "Quickstart", href: "#" }, { label: "Send an email", href: "#", current: true }] },
        { title: "Channels", links: [{ label: "Email", href: "#" }, { label: "Phone", href: "#" }, { label: "Agent2Agent", href: "#" }] },
      ]}
      headings={[{ id: "request", label: "Request" }, { id: "response", label: "Response" }]}
    >
      <h2 id="request" className="text-h4 text-fg">Request</h2>
      <p>Pass the recipient, a subject and the body. The message goes out from the agent's own address.</p>
      <h2 id="response" className="text-h4 text-fg">Response</h2>
      <p>The call returns the message id and its state.</p>
    </DocsPage>
  );
}
