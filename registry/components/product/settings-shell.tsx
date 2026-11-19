"use client";

import * as React from "react";
import { CopyIcon, DotsThreeIcon, PlusIcon, UploadSimpleIcon } from "@phosphor-icons/react/ssr";

import { AppPageBody, AppPageHead, AppShell, type AppNavGroup } from "@/components/product/app-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type Member = { name: string; email: string; role: string; joined: string };

export const MEMBERS: Member[] = [
  { name: "Jordan at Acme", email: "jordan@acme.com", role: "Admin", joined: "Jul 27, 2026" },
  { name: "Sam at Acme", email: "sam@acme.com", role: "Member", joined: "Aug 3, 2026" },
];

/**
 * Settings in the console's frame (the organization page): the page head with Profile, Billing and Usage tabs, the
 * organization card (logo, name field with Save, the ID with a copy button) and the members table with an invite
 * action. Billing and Usage take any content.
 */
function SettingsShell({ organization = "Acme", organizationId = "org_2f8d6b7f37b7d646", members = MEMBERS, billing, usage, nav }: { organization?: string; organizationId?: string; members?: Member[]; billing?: React.ReactNode; usage?: React.ReactNode; nav?: AppNavGroup[] }) {
  const [name, setName] = React.useState(organization);
  return (
    <AppShell nav={nav} current="My Organisation">
      <AppPageHead title="Organization settings" description="Your organization's profile, members, billing and usage." />
      <AppPageBody>
        <Tabs defaultValue="profile" className="grid gap-4">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-medium">Organization</CardTitle>
                <CardAction>
                  <Button size="sm" disabled={!name.trim() || name === organization}>
                    Save
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="grid gap-5">
                <div className="flex items-center gap-3">
                  <Avatar size="lg">
                    <AvatarFallback>{name.charAt(0) || "A"}</AvatarFallback>
                  </Avatar>
                  <Button variant="outline" size="sm">
                    <UploadSimpleIcon />
                    Upload logo
                  </Button>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="org-name">Organization name</FieldLabel>
                    <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="org-id">Organization ID</FieldLabel>
                    <div className="flex items-center gap-2">
                      <Input id="org-id" value={organizationId} readOnly className="font-mono" />
                      <Button variant="ghost" size="icon" aria-label="Copy ID" onClick={() => navigator.clipboard?.writeText(organizationId)}>
                        <CopyIcon weight="duotone" />
                      </Button>
                    </div>
                  </Field>
                </div>
              </CardContent>
            </Card>
            <section className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-body leading-body font-medium text-fg">Members</h2>
                <Button variant="outline" size="sm">
                  <PlusIcon />
                  Invite member
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((m) => (
                      <TableRow key={m.email}>
                        <TableCell>
                          <span className="flex items-center gap-2.5">
                            <Avatar size="sm">
                              <AvatarFallback>{m.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="grid">
                              <span className="font-medium">{m.name}</span>
                              <span className="text-caption text-fg-muted">{m.email}</span>
                            </span>
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={m.role === "Admin" ? "purple" : "gray"} size="sm">
                            {m.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{m.joined}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" aria-label={`Actions for ${m.name}`}>
                            <DotsThreeIcon weight="bold" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </TabsContent>
          <TabsContent value="billing">{billing ?? <p className="text-body text-fg-muted">Your plan, payment method and invoices.</p>}</TabsContent>
          <TabsContent value="usage">{usage ?? <p className="text-body text-fg-muted">Agents, mail storage, call minutes and messages this cycle.</p>}</TabsContent>
        </Tabs>
      </AppPageBody>
    </AppShell>
  );
}

export { SettingsShell };
