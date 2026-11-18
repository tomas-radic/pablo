import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { listVisits } from "@/lib/visits";
import { formatVisitDate } from "@/lib/dates";
import { totalLabel } from "@/lib/items";
import { SignOutButton } from "./sign-out";
import { ChevronIcon, PencilIcon, PlusIcon, iconButtonClass, primaryButtonClass } from "./ui";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="flex items-center justify-between">
        <p className="text-sm font-semibold tracking-wide text-accent-strong uppercase">Publog</p>
        <SignOutButton />
      </header>
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Pub visits</h1>
        <Link href="/visits/new" className={`${primaryButtonClass} h-11 px-4`}>
          <PlusIcon /> New visit
        </Link>
      </div>
      <Suspense fallback={<ListSkeleton />}>
        <VisitList />
      </Suspense>
    </main>
  );
}

async function VisitList() {
  const user = await getCurrentUser();
  const visits = listVisits(user.id);

  if (visits.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
        <p className="font-medium">No visits yet</p>
        <p className="mt-1 text-sm text-muted">Start one when you sit down at the table.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {visits.map((visit) => (
        <li key={visit.id} className="flex items-center">
          <Link
            href={`/visits/${visit.id}`}
            className="flex min-w-0 flex-1 items-center gap-3 py-3.5 pr-1 pl-4 active:bg-surface-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{visit.label}</p>
              <p className="mt-0.5 truncate text-sm text-muted">{formatVisitDate(visit.date)}</p>
              {visit.itemCount > 0 && (
                <p className="mt-0.5 truncate text-sm text-muted">
                  {visit.itemCount} {visit.itemCount === 1 ? "item" : "items"}
                  {" · "}
                  <span className="font-medium text-ink tabular-nums">{totalLabel(visit.total)}</span>
                </p>
              )}
            </div>
            <ChevronIcon className="size-5 text-muted" />
          </Link>
          <Link
            href={`/visits/${visit.id}/edit`}
            aria-label={`Edit ${visit.label}`}
            className={`${iconButtonClass} mr-2 text-muted`}
          >
            <PencilIcon className="size-[18px]" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-px overflow-hidden rounded-2xl border border-line bg-surface" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2 px-4 py-4">
          <div className="h-4 w-2/5 animate-pulse rounded bg-surface-2" />
          <div className="h-3 w-3/5 animate-pulse rounded bg-surface-2" />
        </div>
      ))}
    </div>
  );
}
