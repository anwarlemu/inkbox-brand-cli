import { Faq } from "@/components/blocks/faq";

export function Preview() {
  return (
    <Faq
      questions={[
        { question: "What is an agent identity?", answer: "An identity gives one agent its own handle, inbox, phone number and Agent Card." },
        { question: "Can I use my own domain?", answer: "Yes. Paid plans add custom email domains." },
      ]}
    />
  );
}
