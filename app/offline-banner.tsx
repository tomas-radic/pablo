"use client";

import { useOffline } from "next/offline";

export function OfflineBanner() {
  const offline = useOffline();
  if (!offline) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-30 bg-ink px-4 pt-[max(env(safe-area-inset-top),0.5rem)] pb-2 text-center text-sm font-medium text-bg"
    >
      You’re offline. Changes stay on this phone until you submit them online.
    </div>
  );
}
