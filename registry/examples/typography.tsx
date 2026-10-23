import { TypographyBlockquote, TypographyH1, TypographyH2, TypographyH3, TypographyH4, TypographyInlineCode, TypographyLarge, TypographyLead, TypographyList, TypographyMuted, TypographyP, TypographySmall, TypographyTable } from "@/components/ui/typography";

export function Preview() {
  return (
    <article className="w-full max-w-160">
      <TypographyH3>Tunnel</TypographyH3>
      <TypographyMuted>Stable hostname routing inbound traffic to @baked.</TypographyMuted>
      <TypographyP>
        Each agent gets a public host such as <TypographyInlineCode>baked.inkboxwire.com</TypographyInlineCode>. Traffic reaches the agent wherever it runs, with TLS handled at the edge by default.
      </TypographyP>
      <TypographyBlockquote>Direct card URLs stay public whether or not you list in the directory. Listing only controls discovery.</TypographyBlockquote>
      <TypographyList>
        <li>Opt your card into the public directory with an admin key.</li>
        <li>View the card Inkbox serves for you.</li>
        <li>Find workers in the public directory.</li>
      </TypographyList>
      <TypographyTable>
        <thead>
          <tr>
            <th>Field</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Handle</td>
            <td>@test-agent-233</td>
          </tr>
          <tr>
            <td>Email</td>
            <td>test-agent-233@inkboxmail.com</td>
          </tr>
        </tbody>
      </TypographyTable>
    </article>
  );
}

export function Scale() {
  return (
    <div className="grid w-full max-w-160 gap-3">
      <TypographyH1>Agent Workspace</TypographyH1>
      <TypographyH2>Create Your First Agent</TypographyH2>
      <TypographyH3>Create Agent Identity</TypographyH3>
      <TypographyH4>Email</TypographyH4>
      <TypographyLead>Set up an identity to unlock mailbox, phone, and vault features.</TypographyLead>
      <TypographyLarge>Your agent will be reachable at</TypographyLarge>
      <TypographySmall>Shared lines are assigned when someone connects.</TypographySmall>
      <TypographyList ordered>
        <li>Create the agent.</li>
        <li>Copy its API key.</li>
      </TypographyList>
    </div>
  );
}
