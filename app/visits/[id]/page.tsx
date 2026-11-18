import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { getVisit } from "@/lib/visits";
import { formatVisitDate } from "@/lib/dates";
import { PageHeader } from "../page-header";
import { PencilIcon, iconButtonClass } from "../../ui";
import { VisitEditor } from "./visit-editor";

export const metadata: Metadata = { title: "Visit" };

export default function VisitPage(props: PageProps<"/visits/[id]">) {
  return (
    <main className="flex flex-1 flex-col gap-4">
      <Suspense fallback={<VisitSkeleton />}>
        <Visit params={props.params} />
      </Suspense>
    </main>
  );
}

async function Visit({ params }: { params: PageProps<"/visits/[id]">["params"] }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const visit = getVisit(user.id, Number(id));
  if (!visit) notFound();

  return (
    <>
      <PageHeader
        backHref="/"
        title={visit.label}
        subtitle={formatVisitDate(visit.date)}
        action={
          <Link
            href={`/visits/${visit.id}/edit?from=visit`}
            aria-label="Edit visit"
            className={`${iconButtonClass} text-muted`}
          >
            <PencilIcon className="size-[18px]" />
          </Link>
        }
      />
      <VisitEditor
        key={visit.id}
        visitId={visit.id}
        server={{ items: visit.items, submittedAt: visit.submittedAt }}
      />
    </>
  );
}

function VisitSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-11 w-1/2 animate-pulse rounded-xl bg-surface-2" />
      <div className="h-20 animate-pulse rounded-2xl bg-surface-2" />
      <div className="h-40 animate-pulse rounded-2xl bg-surface-2" />
    </div>
  );
}
