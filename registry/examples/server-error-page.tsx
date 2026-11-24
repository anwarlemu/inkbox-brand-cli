import { ServerErrorPage } from "@/components/site/server-error-page";

export function Preview() {
  return <ServerErrorPage />;
}

export function WithStatus() {
  return <ServerErrorPage statusHref="https://status.acme.com" />;
}
