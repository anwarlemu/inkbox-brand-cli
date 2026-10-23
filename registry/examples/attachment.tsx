"use client";

import * as React from "react";
import { ArrowClockwiseIcon, DownloadSimpleIcon, FileCsvIcon, FilePdfIcon, FileTextIcon, ImageIcon, XIcon } from "@phosphor-icons/react/ssr";

import { Attachment, AttachmentAction, AttachmentActions, AttachmentContent, AttachmentDescription, AttachmentGroup, AttachmentMedia, AttachmentTitle, AttachmentTrigger } from "@/components/ui/attachment";

export function Preview() {
  const [files, setFiles] = React.useState([
    { name: "invoice-2026-08.pdf", size: "248 KB", icon: FilePdfIcon },
    { name: "contacts-export.csv", size: "1.2 MB", icon: FileCsvIcon },
    { name: "agent-card.json", size: "3 KB", icon: FileTextIcon },
  ]);
  return (
    <AttachmentGroup className="max-w-full">
      {files.map(({ name, size, icon: Icon }) => (
        <Attachment key={name}>
          <AttachmentTrigger aria-label={`Open ${name}`} />
          <AttachmentMedia>
            <Icon weight="fill" />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{name}</AttachmentTitle>
            <AttachmentDescription>{size}</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label={`Remove ${name}`} onClick={() => setFiles((all) => all.filter((f) => f.name !== name))}>
              <XIcon />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      ))}
    </AttachmentGroup>
  );
}

export function States() {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <Attachment state="idle">
        <AttachmentMedia>
          <FileTextIcon weight="fill" />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>quickstart.md</AttachmentTitle>
          <AttachmentDescription>Waiting</AttachmentDescription>
        </AttachmentContent>
      </Attachment>
      <Attachment state="uploading">
        <AttachmentMedia>
          <FilePdfIcon weight="fill" />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>contract-signed.pdf</AttachmentTitle>
          <AttachmentDescription>62% of 4.8 MB</AttachmentDescription>
        </AttachmentContent>
      </Attachment>
      <Attachment state="error">
        <AttachmentMedia>
          <FileCsvIcon weight="fill" />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>leads.csv</AttachmentTitle>
          <AttachmentDescription>Larger than 25 MB</AttachmentDescription>
        </AttachmentContent>
        <AttachmentActions>
          <AttachmentAction aria-label="Retry leads.csv">
            <ArrowClockwiseIcon />
          </AttachmentAction>
        </AttachmentActions>
      </Attachment>
    </div>
  );
}

export function Vertical() {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <Attachment orientation="vertical">
        <AttachmentMedia variant="image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/octopus.png" alt="" />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>octopus.png</AttachmentTitle>
          <AttachmentDescription>94 KB</AttachmentDescription>
        </AttachmentContent>
        <AttachmentActions>
          <AttachmentAction aria-label="Download octopus.png">
            <DownloadSimpleIcon />
          </AttachmentAction>
        </AttachmentActions>
      </Attachment>
      <Attachment orientation="vertical" state="processing">
        <AttachmentMedia>
          <ImageIcon weight="fill" />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>screenshot.png</AttachmentTitle>
          <AttachmentDescription>Scanning</AttachmentDescription>
        </AttachmentContent>
      </Attachment>
    </div>
  );
}

export function Sizes() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {(["default", "sm", "xs"] as const).map((size) => (
        <Attachment key={size} size={size}>
          <AttachmentMedia>
            <FilePdfIcon weight="fill" />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>invoice.pdf</AttachmentTitle>
            <AttachmentDescription>248 KB</AttachmentDescription>
          </AttachmentContent>
        </Attachment>
      ))}
    </div>
  );
}
