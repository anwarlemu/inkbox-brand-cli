"use client";

import * as React from "react";
import { CheckIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// A short set of questions asked one at a time (extrapolated from the console, Figma 427:2715: Create Agent Identity's
// choices and the Where does this agent run? picker). A choice is a 44px white card with the field edge and 8px
// corners, the brand's radio (a thick pink ring when chosen) or checkbox (purple when checked) 14px in, a 14px ink label
// and its number or letter key at the right; a chosen card takes the purple edge. The question is 16px medium ink with
// a 14px secondary line under it; progress is a 12px muted count over a thin purple bar. Changing questions is instant:
// it is driven by the keyboard as often as by the pointer. The answers submit as one native form (FormData), every
// question's inputs included, so the page owns saving and what happens next.

type Choice = { readonly value: string; readonly disabled?: boolean };
type ItemConfig = { readonly name: string; readonly required?: boolean; readonly multiple?: boolean; readonly choices?: readonly Choice[] };
type Shortcuts = "numbers" | "letters" | "none";

type QuestionnaireContextValue = {
  order: string[];
  active: string | undefined;
  goTo: (name: string) => void;
  shortcuts: Shortcuts;
  answers: Record<string, string[]>;
  other: Record<string, string>;
  errors: Record<string, string | undefined>;
  configs: React.RefObject<Map<string, ItemConfig>>;
  register: (config: ItemConfig) => () => void;
  setAnswer: (name: string, value: string, checked: boolean) => void;
  setOther: (name: string, text: string) => void;
  next: () => void;
  previous: () => void;
  skip: () => void;
};

const QuestionnaireContext = React.createContext<QuestionnaireContextValue | null>(null);
const ItemContext = React.createContext<{ name: string; required: boolean; multiple: boolean; id: string } | null>(null);

function useQuestionnaire() {
  const context = React.useContext(QuestionnaireContext);
  if (!context) throw new Error("Questionnaire parts must be inside a Questionnaire.");
  return context;
}

function useItem() {
  const context = React.useContext(ItemContext);
  if (!context) throw new Error("This part must be inside a QuestionnaireItem.");
  return context;
}

const shortcutKey = (index: number, shortcuts: Shortcuts) => (shortcuts === "none" || index > 8 ? undefined : shortcuts === "letters" ? String.fromCharCode(65 + index) : String(index + 1));

/**
 * The questions and their answers. Pass `items` (name, required, multiple, choices) so the order, progress and shortcuts
 * are known on the server; without it the order is the QuestionnaireItems' order. `defaultItem` or a controlled
 * `item` with `onItemChange` picks the question shown. `shortcuts` puts 1 to 9 (or A to I) on the choices.
 */
function Questionnaire({
  items,
  defaultItem,
  item,
  onItemChange,
  shortcuts = "numbers",
  className,
  onSubmit,
  onKeyDown,
  children,
  ...props
}: Omit<React.ComponentProps<"form">, "onSubmit"> & {
  items?: readonly ItemConfig[];
  defaultItem?: string;
  item?: string;
  onItemChange?: (name: string) => void;
  shortcuts?: Shortcuts;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const form = React.useRef<HTMLFormElement>(null);
  const configs = React.useRef(new Map<string, ItemConfig>(items?.map((i) => [i.name, i])));
  const [registered, setRegistered] = React.useState<string[]>([]);
  const order = items ? items.map((i) => i.name) : registered;
  const [internal, setInternal] = React.useState(defaultItem ?? items?.[0]?.name);
  const active = item ?? internal ?? order[0];
  const [answers, setAnswers] = React.useState<Record<string, string[]>>({});
  const [other, setOtherState] = React.useState<Record<string, string>>({});
  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({});

  const focusItem = React.useCallback((name: string) => {
    requestAnimationFrame(() => {
      const fieldset = form.current?.querySelector<HTMLElement>(`[data-slot=questionnaire-item][data-name="${CSS.escape(name)}"]`);
      fieldset?.querySelector<HTMLElement>("input:not(:disabled)")?.focus({ preventScroll: true });
    });
  }, []);

  const goTo = React.useCallback(
    (name: string) => {
      if (item === undefined) setInternal(name);
      onItemChange?.(name);
      focusItem(name);
    },
    [item, onItemChange, focusItem],
  );

  const register = React.useCallback((config: ItemConfig) => {
    configs.current.set(config.name, { ...configs.current.get(config.name), ...config });
    setRegistered((list) => (list.includes(config.name) ? list : [...list, config.name]));
    return () => setRegistered((list) => list.filter((n) => n !== config.name));
  }, []);

  const answered = React.useCallback((name: string) => (answers[name]?.length ?? 0) > 0 || (other[name] ?? "").trim() !== "", [answers, other]);

  const validate = React.useCallback(
    (name: string) => {
      const config = configs.current.get(name);
      const message = config?.required && !answered(name) ? (config.multiple ? "Choose at least one answer to continue." : "Choose an answer to continue.") : undefined;
      setErrors((e) => ({ ...e, [name]: message }));
      return !message;
    },
    [answered],
  );

  const setAnswer = React.useCallback((name: string, value: string, checked: boolean) => {
    const multiple = configs.current.get(name)?.multiple;
    setAnswers((a) => ({ ...a, [name]: multiple ? (checked ? [...(a[name] ?? []).filter((v) => v !== value), value] : (a[name] ?? []).filter((v) => v !== value)) : checked ? [value] : [] }));
    if (!multiple && checked) setOtherState((o) => ({ ...o, [name]: "" }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  }, []);

  const setOther = React.useCallback((name: string, text: string) => {
    setOtherState((o) => ({ ...o, [name]: text }));
    if (text && !configs.current.get(name)?.multiple) setAnswers((a) => ({ ...a, [name]: [] }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  }, []);

  const index = active ? order.indexOf(active) : -1;
  const next = React.useCallback(() => {
    if (!active || !validate(active)) return focusItem(active ?? "");
    const following = order[index + 1];
    if (following) goTo(following);
  }, [active, validate, focusItem, order, index, goTo]);
  const previous = React.useCallback(() => {
    const before = order[index - 1];
    if (before) goTo(before);
  }, [order, index, goTo]);
  const skip = React.useCallback(() => {
    if (!active) return;
    setAnswers((a) => ({ ...a, [active]: [] }));
    setOtherState((o) => ({ ...o, [active]: "" }));
    setErrors((e) => ({ ...e, [active]: undefined }));
    const following = order[index + 1];
    if (following) goTo(following);
  }, [active, order, index, goTo]);

  const value = React.useMemo<QuestionnaireContextValue>(
    () => ({ order, active, goTo, shortcuts, answers, other, errors, configs, register, setAnswer, setOther, next, previous, skip }),
    [order, active, goTo, shortcuts, answers, other, errors, register, setAnswer, setOther, next, previous, skip],
  );

  return (
    <QuestionnaireContext.Provider value={value}>
      <form
        ref={form}
        data-slot="questionnaire"
        noValidate
        className={cn("flex w-full min-w-0 flex-col gap-4", className)}
        onSubmit={(event) => {
          // Every required question must be answered; the first one that is not is shown with its message.
          const missing = order.find((name) => !validate(name));
          if (missing) {
            event.preventDefault();
            goTo(missing);
            return;
          }
          onSubmit?.(event);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented || !active || event.metaKey || event.ctrlKey || event.altKey) return;
          const target = event.target as HTMLElement;
          const typing = target instanceof HTMLInputElement && target.type === "text";
          if (event.key === "Enter" && !(target instanceof HTMLButtonElement) && !(target instanceof HTMLTextAreaElement)) {
            event.preventDefault();
            if (index < order.length - 1) next();
            else form.current?.requestSubmit();
            return;
          }
          if (typing || shortcuts === "none") return;
          const key = event.key.toUpperCase();
          const at = shortcuts === "letters" ? key.charCodeAt(0) - 65 : Number(key) - 1;
          if (key.length !== 1 || Number.isNaN(at) || at < 0 || at > 8) return;
          const choice = form.current?.querySelectorAll<HTMLInputElement>(`[data-slot=questionnaire-item][data-name="${CSS.escape(active)}"] [data-slot=questionnaire-choice-input]`)[at];
          if (!choice || choice.disabled) return;
          event.preventDefault();
          choice.focus();
          setAnswer(active, choice.value, choice.type === "checkbox" ? !choice.checked : true);
        }}
        {...props}
      >
        {children}
      </form>
    </QuestionnaireContext.Provider>
  );
}

/** Where the person is: "Question 2 of 3" in 12px muted medium over a 4px purple bar. */
function QuestionnaireProgress({ className, children, ...props }: React.ComponentProps<"div">) {
  const { order, active } = useQuestionnaire();
  const at = active ? order.indexOf(active) + 1 : 0;
  const total = order.length;
  return (
    <div data-slot="questionnaire-progress" className={cn("grid w-full gap-1.5", className)} {...props}>
      <span className="font-sans text-caption leading-tight font-medium text-fg-muted tabular-nums" aria-live="polite">
        {children ?? (total ? `Question ${at} of ${total}` : " ")}
      </span>
      <Progress value={total ? (at / total) * 100 : 0} aria-label="Progress" className="h-1" />
    </div>
  );
}

/** One question. Only the current one shows; the others stay in the form so their answers submit with it. */
function QuestionnaireItem({ name, required = false, multiple = false, className, children, ...props }: Omit<React.ComponentProps<"fieldset">, "name"> & { name: string; required?: boolean; multiple?: boolean }) {
  const { active, register, errors } = useQuestionnaire();
  const id = React.useId();
  React.useLayoutEffect(() => register({ name, required, multiple }), [register, name, required, multiple]);
  const context = React.useMemo(() => ({ name, required, multiple, id }), [name, required, multiple, id]);
  const isActive = active === name;
  return (
    <ItemContext.Provider value={context}>
      <fieldset
        data-slot="questionnaire-item"
        data-name={name}
        data-active={isActive || undefined}
        hidden={!isActive}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description${errors[name] ? ` ${id}-error` : ""}`}
        aria-invalid={errors[name] ? true : undefined}
        className={cn("m-0 flex min-w-0 flex-col gap-4 border-0 p-0 outline-none", className)}
        {...props}
      >
        {children}
      </fieldset>
    </ItemContext.Provider>
  );
}

function QuestionnaireTitle({ className, ...props }: React.ComponentProps<"div">) {
  const { id } = useItem();
  return <div id={`${id}-title`} data-slot="questionnaire-title" className={cn("font-sans text-body-lg leading-snug font-medium text-pretty text-fg", className)} {...props} />;
}

function QuestionnaireDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { id } = useItem();
  return <p id={`${id}-description`} data-slot="questionnaire-description" className={cn("-mt-3 font-sans text-body leading-body text-pretty text-fg-secondary", className)} {...props} />;
}

/** The choices of a question, 8px apart; each direct QuestionnaireChoice gets its shortcut in order. */
function QuestionnaireChoices({ className, children, ...props }: React.ComponentProps<"div">) {
  const { multiple, id } = useItem();
  let index = 0;
  return (
    <div data-slot="questionnaire-choices" role={multiple ? "group" : "radiogroup"} aria-labelledby={`${id}-title`} className={cn("group/questionnaire-choices grid min-w-0 gap-2", className)} {...props}>
      {React.Children.map(children, (child) => (React.isValidElement<{ index?: number }>(child) && child.type === QuestionnaireChoice ? React.cloneElement(child, { index: index++ }) : child))}
    </div>
  );
}

function QuestionnaireChoice({ value, disabled = false, index = 0, className, children, ...props }: Omit<React.ComponentProps<"label">, "children"> & { value: string; disabled?: boolean; index?: number; children?: React.ReactNode }) {
  const { answers, setAnswer, shortcuts } = useQuestionnaire();
  const { name, multiple } = useItem();
  const checked = answers[name]?.includes(value) ?? false;
  const key = shortcutKey(index, shortcuts);
  return (
    <label
      data-slot="questionnaire-choice"
      data-type={multiple ? "checkbox" : "radio"}
      data-checked={checked || undefined}
      data-disabled={disabled || undefined}
      className={cn(
        "group/questionnaire-choice relative flex min-h-11 cursor-pointer items-start gap-2.5 rounded-control border border-line-field bg-surface px-3.5 py-2.5 text-start font-sans text-body leading-snug text-fg select-none transition-[background-color,border-color] duration-150 ease-out hover:bg-subtle has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-ring data-checked:border-line-brand data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:opacity-50 motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      <input
        data-slot="questionnaire-choice-input"
        type={multiple ? "checkbox" : "radio"}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={(event) => setAnswer(name, value, event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        data-slot="questionnaire-choice-indicator"
        className={cn(
          "pointer-events-none mt-px flex size-4.5 shrink-0 items-center justify-center border-[1.5px] border-line-strong bg-surface text-on-primary transition-[background-color,border-color,border-width] duration-150 ease-out motion-reduce:transition-none",
          multiple ? "rounded-pill group-data-checked/questionnaire-choice:border-primary group-data-checked/questionnaire-choice:bg-primary" : "rounded-pill group-data-checked/questionnaire-choice:border-4 group-data-checked/questionnaire-choice:border-pink",
        )}
      >
        {multiple && <CheckIcon weight="bold" className="hidden size-3.5 group-data-checked/questionnaire-choice:block" />}
      </span>
      <span data-slot="questionnaire-choice-label" className="flex min-w-0 flex-1 flex-col gap-0.5">
        {children}
      </span>
      {key && (
        <Kbd data-slot="questionnaire-choice-shortcut" aria-hidden className="ml-auto hidden shrink-0 sm:inline-flex">
          {key}
        </Kbd>
      )}
    </label>
  );
}

/** A choice's second line: 14px muted. */
function QuestionnaireChoiceDescription({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="questionnaire-choice-description" className={cn("text-fg-muted", className)} {...props} />;
}

/** A free answer typed instead of a choice (another answer); typing clears a single choice, choosing clears the text. */
function QuestionnaireInput({ className, ...props }: Omit<React.ComponentProps<typeof Input>, "name" | "value" | "onChange">) {
  const { other, setOther } = useQuestionnaire();
  const { name } = useItem();
  return (
    <div data-slot="questionnaire-input-wrapper" className="group/questionnaire-input relative w-full min-w-0">
      <Input data-slot="questionnaire-input" type="text" name={name} value={other[name] ?? ""} onChange={(event) => setOther(name, event.target.value)} className={cn("h-11", className)} {...props} />
    </div>
  );
}

/** Why the question cannot be passed yet: 12px red, read out when it appears. */
function QuestionnaireError({ className, children, ...props }: React.ComponentProps<"p">) {
  const { errors } = useQuestionnaire();
  const { name, id } = useItem();
  const message = children ?? errors[name];
  if (!message) return null;
  return (
    <p id={`${id}-error`} role="alert" data-slot="questionnaire-error" className={cn("-mt-2 font-sans text-caption leading-tight text-danger", className)} {...props}>
      {message}
    </p>
  );
}

/** The buttons under the question: Previous at the left, then Skip and Next (or Submit on the last question). */
function QuestionnaireActions({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="questionnaire-actions" className={cn("grid min-h-11 w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2", className)} {...props} />;
}

type ActionProps = Omit<React.ComponentProps<typeof Button>, "onClick" | "type"> & { onClick?: React.MouseEventHandler<HTMLButtonElement> };

function QuestionnairePrevious({ children, className, variant = "secondary", onClick, ...props }: ActionProps) {
  const { order, active, previous } = useQuestionnaire();
  const first = !active || order.indexOf(active) <= 0;
  return (
    <Button
      data-slot="questionnaire-previous"
      variant={variant}
      disabled={first}
      className={cn("col-start-1 row-start-1 justify-self-start", first && "invisible", className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) previous();
      }}
      {...props}
    >
      {children ?? "Previous"}
    </Button>
  );
}

function QuestionnaireSkip({ children, className, variant = "ghost", onClick, ...props }: ActionProps) {
  const { active, configs, order, skip } = useQuestionnaire();
  const required = active ? configs.current.get(active)?.required : true;
  const last = !active || order.indexOf(active) === order.length - 1;
  if (required || last) return null;
  return (
    <Button
      data-slot="questionnaire-skip"
      variant={variant}
      className={cn("col-start-2 row-start-1 justify-self-end px-4 text-fg-secondary", className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) skip();
      }}
      {...props}
    >
      {children ?? "Skip"}
    </Button>
  );
}

function QuestionnaireNext({ children, className, variant = "default", onClick, ...props }: ActionProps) {
  const { order, active, next } = useQuestionnaire();
  if (!active || order.indexOf(active) >= order.length - 1) return null;
  return (
    <Button
      data-slot="questionnaire-next"
      variant={variant}
      className={cn("col-start-3 row-start-1 justify-self-end", className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) next();
      }}
      {...props}
    >
      {children ?? "Next"}
    </Button>
  );
}

function QuestionnaireSubmit({ children, className, variant = "default", ...props }: Omit<React.ComponentProps<typeof Button>, "type">) {
  const { order, active } = useQuestionnaire();
  if (!active || order.indexOf(active) !== order.length - 1) return null;
  return (
    <Button data-slot="questionnaire-submit" type="submit" variant={variant} className={cn("col-start-3 row-start-1 justify-self-end", className)} {...props}>
      {children ?? "Submit"}
    </Button>
  );
}

export {
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
};
