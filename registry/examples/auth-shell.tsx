import { KeyIcon } from "@phosphor-icons/react/ssr";

import { AuthShell } from "@/components/product/auth-shell";

export function Preview() {
  return <AuthShell providers={[{ label: "Continue with single sign-on", icon: <KeyIcon weight="fill" />, href: "/sso" }]} />;
}

export function WithArt() {
  return (
    <AuthShell
      providers={[{ label: "Continue with single sign-on", icon: <KeyIcon weight="fill" />, href: "/sso" }]}
      // eslint-disable-next-line @next/next/no-img-element
      art={<img src="/octopus.png" alt="" width={160} height={142} className="mx-auto mb-6 h-auto w-32 opacity-80" />}
    />
  );
}
