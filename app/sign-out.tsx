"use client";

import { signOutAction } from "./visits/actions";
import { clearOfflineCache } from "./service-worker";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        await clearOfflineCache();
        await signOutAction();
      }}
    >
      <button type="submit" className="h-11 rounded-full px-3 text-sm font-medium text-muted active:bg-surface-2">
        Sign out
      </button>
    </form>
  );
}
