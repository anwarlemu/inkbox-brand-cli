"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function Preview() {
  return (
    <Tabs defaultValue="mailboxes" className="w-full">
      <TabsList>
        <TabsTrigger value="mailboxes">Mailboxes</TabsTrigger>
        <TabsTrigger value="rules">Contact rules</TabsTrigger>
        <TabsTrigger value="domains">Custom domains</TabsTrigger>
      </TabsList>
      <TabsContent value="mailboxes" className="text-body text-fg-muted">Manage mailboxes for your organization.</TabsContent>
      <TabsContent value="rules" className="text-body text-fg-muted">Allow or block who can reach each agent.</TabsContent>
      <TabsContent value="domains" className="text-body text-fg-muted">Send and receive from your own domain.</TabsContent>
    </Tabs>
  );
}

export function Full() {
  return (
    <Tabs defaultValue="login" className="w-full max-w-86">
      <TabsList full>
        <TabsTrigger value="login">Login</TabsTrigger>
        <TabsTrigger value="signup">Sign up</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
