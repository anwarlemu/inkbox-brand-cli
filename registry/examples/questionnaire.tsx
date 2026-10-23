"use client";

import * as React from "react";

import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire";

const ITEMS = [
  { name: "channel", required: true, choices: [{ value: "email" }, { value: "phone" }, { value: "imessage" }] },
  { name: "include", multiple: true, choices: [{ value: "sender" }, { value: "summary" }, { value: "attachments" }, { value: "next-step" }] },
  { name: "when", required: true, choices: [{ value: "now" }, { value: "hourly" }, { value: "daily" }] },
] as const;

function Saved({ answers }: { answers: string }) {
  return (
    <p role="status" className="rounded-control bg-success-bg px-3.5 py-2.5 text-body text-fg">
      Saved. {answers}
    </p>
  );
}

export function Preview() {
  const [saved, setSaved] = React.useState<string>();
  return (
    <div className="mx-auto grid w-full max-w-110 gap-4">
      <Questionnaire
        items={ITEMS}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setSaved(`Channel: ${data.get("channel")}. Include: ${data.getAll("include").join(", ") || "nothing"}. When: ${data.get("when")}.`);
        }}
      >
        <QuestionnaireProgress />
        <QuestionnaireItem name="channel" required>
          <QuestionnaireTitle>Where should @baked tell you about new mail?</QuestionnaireTitle>
          <QuestionnaireDescription>Choose a channel, or type another one.</QuestionnaireDescription>
          <QuestionnaireChoices>
            <QuestionnaireChoice value="email">
              <span className="font-medium">Email</span>
              <QuestionnaireChoiceDescription>A note to robert@baked.design</QuestionnaireChoiceDescription>
            </QuestionnaireChoice>
            <QuestionnaireChoice value="phone">
              <span className="font-medium">Phone</span>
              <QuestionnaireChoiceDescription>A text from the agent&apos;s number</QuestionnaireChoiceDescription>
            </QuestionnaireChoice>
            <QuestionnaireChoice value="imessage">
              <span className="font-medium">iMessage</span>
              <QuestionnaireChoiceDescription>Through the shared iMessage line</QuestionnaireChoiceDescription>
            </QuestionnaireChoice>
            <QuestionnaireInput aria-label="Another channel" placeholder="Another channel" />
          </QuestionnaireChoices>
          <QuestionnaireError />
        </QuestionnaireItem>
        <QuestionnaireItem name="include" multiple>
          <QuestionnaireTitle>What should each note include?</QuestionnaireTitle>
          <QuestionnaireDescription>Choose any, or skip this question.</QuestionnaireDescription>
          <QuestionnaireChoices>
            <QuestionnaireChoice value="sender">The sender</QuestionnaireChoice>
            <QuestionnaireChoice value="summary">A one-line summary</QuestionnaireChoice>
            <QuestionnaireChoice value="attachments">Attachments</QuestionnaireChoice>
            <QuestionnaireChoice value="next-step">The suggested next step</QuestionnaireChoice>
          </QuestionnaireChoices>
          <QuestionnaireError />
        </QuestionnaireItem>
        <QuestionnaireItem name="when" required>
          <QuestionnaireTitle>How often?</QuestionnaireTitle>
          <QuestionnaireDescription>Batched notes arrive once per period.</QuestionnaireDescription>
          <QuestionnaireChoices>
            <QuestionnaireChoice value="now">As each email arrives</QuestionnaireChoice>
            <QuestionnaireChoice value="hourly">Once an hour</QuestionnaireChoice>
            <QuestionnaireChoice value="daily">Once a day</QuestionnaireChoice>
          </QuestionnaireChoices>
          <QuestionnaireError />
        </QuestionnaireItem>
        <QuestionnaireActions>
          <QuestionnairePrevious />
          <QuestionnaireSkip />
          <QuestionnaireNext />
          <QuestionnaireSubmit>Save rule</QuestionnaireSubmit>
        </QuestionnaireActions>
      </Questionnaire>
      {saved && <Saved answers={saved} />}
    </div>
  );
}

const PLAN = [{ name: "line", required: true, choices: [{ value: "shared" }, { value: "dedicated" }, { value: "port" }] }] as const;

export function Disabled() {
  return (
    <Questionnaire items={PLAN} shortcuts="letters" className="mx-auto max-w-110" onSubmit={(event) => event.preventDefault()}>
      <QuestionnaireItem name="line" required>
        <QuestionnaireTitle>Which iMessage line should the agent use?</QuestionnaireTitle>
        <QuestionnaireDescription>No dedicated lines are available to assign right now.</QuestionnaireDescription>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="shared">
            <span className="font-medium">Shared</span>
            <QuestionnaireChoiceDescription>Assigned when someone connects</QuestionnaireChoiceDescription>
          </QuestionnaireChoice>
          <QuestionnaireChoice value="dedicated" disabled>
            <span className="font-medium">Dedicated</span>
            <QuestionnaireChoiceDescription>None available</QuestionnaireChoiceDescription>
          </QuestionnaireChoice>
          <QuestionnaireChoice value="port">
            <span className="font-medium">Port a number</span>
            <QuestionnaireChoiceDescription>Bring an existing number</QuestionnaireChoiceDescription>
          </QuestionnaireChoice>
        </QuestionnaireChoices>
        <QuestionnaireError />
      </QuestionnaireItem>
      <QuestionnaireActions>
        <QuestionnaireSubmit>Assign line</QuestionnaireSubmit>
      </QuestionnaireActions>
    </Questionnaire>
  );
}
