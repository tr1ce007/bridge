"use client";

import { PageError } from "@/components/ui/page-states";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <PageError reset={reset} />;
}
