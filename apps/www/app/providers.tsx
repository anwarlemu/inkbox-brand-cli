"use client";

import * as React from "react";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { ChakraProvider, createSystem, defaultConfig } from "@chakra-ui/react";
import { useServerInsertedHTML } from "next/navigation";

const system = createSystem(defaultConfig, { preflight: false });

// Chakra styles through Emotion, which writes <style> tags inline while the server renders and moves them on the client,
// so hydration would not match. Collect the styles each server render inserts and hand them to Next's
// useServerInsertedHTML, which puts them in the head once.
function EmotionRegistry({ children }: { children: React.ReactNode }) {
  const [registry] = React.useState(() => {
    const cache = createCache({ key: "ck" });
    cache.compat = true;
    const insert = cache.insert;
    let inserted: string[] = [];
    cache.insert = (...args) => {
      const serialized = args[1];
      if (cache.inserted[serialized.name] === undefined) inserted.push(serialized.name);
      return insert(...args);
    };
    const flush = () => {
      const names = inserted;
      inserted = [];
      return names;
    };
    return { cache, flush };
  });
  useServerInsertedHTML(() => {
    const names = registry.flush();
    if (!names.length) return null;
    const styles = names.map((name) => registry.cache.inserted[name]).filter((style) => typeof style === "string").join("");
    return <style data-emotion={`${registry.cache.key} ${names.join(" ")}`} dangerouslySetInnerHTML={{ __html: styles }} />;
  });
  return <CacheProvider value={registry.cache}>{children}</CacheProvider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <EmotionRegistry>
      <ChakraProvider value={system}>{children}</ChakraProvider>
    </EmotionRegistry>
  );
}
