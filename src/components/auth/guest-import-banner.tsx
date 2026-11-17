"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/ui/container";
import { useAuth } from "@/hooks/use-auth";
import { hasGuestData } from "@/lib/auth/guest-import";
import { createLocalUserStore } from "@/lib/data/local-store";
import { GuestImportCard } from "./guest-import-card";
import { isImportHandled, markImportDone } from "./import-flag";

/**
 * Offered once after sign-in, only when this device holds data and the offer was not answered yet.
 * It never imports by itself: the person presses the button (or "Not now").
 */
export function GuestImportBanner() {
  const auth = useAuth();
  const userId = auth.status === "user" ? auth.id : null;
  const [offerFor, setOfferFor] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || isImportHandled(userId)) return;
    let alive = true;
    hasGuestData(createLocalUserStore())
      .then((has) => alive && has && setOfferFor(userId))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [userId]);

  if (!userId || offerFor !== userId) return null;
  return (
    <Container className="pt-4">
      <GuestImportCard
        userId={userId}
        onFinished={() => {
          markImportDone(userId);
          setOfferFor(null);
        }}
      />
    </Container>
  );
}
