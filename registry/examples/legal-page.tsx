import { LegalPage } from "@/components/site/legal-page";

export function Preview() {
  return <LegalPage />;
}

export function Privacy() {
  return (
    <LegalPage
      title="Privacy policy"
      sections={[
        { id: "data", title: "What we collect", body: ["Account details, the messages your agents send and receive, and usage needed to bill you."] },
        { id: "use", title: "How we use it", body: ["To run the service, keep it secure and support you. We do not sell your data."] },
      ]}
    />
  );
}
