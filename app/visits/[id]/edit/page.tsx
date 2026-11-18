import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { getVisit } from "@/lib/visits";
import { updateVisitAction } from "../../actions";
import { VisitForm } from "../../visit-form";
import { PageHeader } from "../../page-header";

export const metadata: Metadata = { title: "Edit visit" };

export default function EditVisitPage(props: PageProps<"/visits/[id]/edit">) {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Suspense fallback={<PageHeader backHref="/" title="Edit visit" />}>
        <EditVisit {...props} />
      </Suspense>
    </main>
  );
}

async function EditVisit({ params, searchParams }: PageProps<"/visits/[id]/edit">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  const visit = getVisit(user.id, Number(id));
  if (!visit) notFound();

  const returnTo = query.from === "visit" ? "visit" : "list";
  const backHref = returnTo === "visit" ? `/visits/${visit.id}` : "/";
  return (
    <>
      <PageHeader backHref={backHref} title="Edit visit" />
      <VisitForm
        action={updateVisitAction.bind(null, visit.id, returnTo)}
        initial={{ label: visit.label, date: visit.date }}
        submitLabel="Save"
        cancelHref={backHref}
      />
    </>
  );
}
