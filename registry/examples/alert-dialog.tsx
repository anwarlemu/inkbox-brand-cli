"use client";

import { KeyIcon, TrashIcon } from "@phosphor-icons/react/ssr";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

function DeleteAgent() {
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete @baked?</AlertDialogTitle>
        <AlertDialogDescription>Its mailbox, phone line and tunnel are deleted with it. Messages it sent stay with their recipients. This cannot be undone.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction variant="destructive">Delete agent</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

export function Preview() {
  return (
    <div className="flex justify-center">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">
            <TrashIcon weight="fill" />
            Delete agent
          </Button>
        </AlertDialogTrigger>
        <DeleteAgent />
      </AlertDialog>
    </div>
  );
}

export function Small() {
  return (
    <div className="flex justify-center">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline">
            <KeyIcon weight="fill" />
            Rotate API key
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <KeyIcon weight="fill" />
            </AlertDialogMedia>
            <AlertDialogTitle>Rotate the API key?</AlertDialogTitle>
            <AlertDialogDescription>Agents using the old key stop working until you give them the new one.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Rotate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function Open() {
  return (
    <div className="min-h-100">
      <AlertDialog defaultOpen>
        <DeleteAgent />
      </AlertDialog>
    </div>
  );
}
