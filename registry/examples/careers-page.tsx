import { CareersPage } from "@/components/site/careers-page";
import { VALUES } from "@/components/site/about-page";

export function Preview() {
  return (
    <CareersPage
      description="Founding engineers, in San Francisco."
      reasons={VALUES}
      roles={[
        { title: "Founding engineer, platform", team: "Engineering", location: "San Francisco", href: "#" },
        { title: "Founding engineer, voice", team: "Engineering", location: "San Francisco", href: "#" },
      ]}
    />
  );
}

export function NoRoles() {
  return <CareersPage roles={[]} />;
}
