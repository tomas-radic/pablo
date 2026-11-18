import type { Metadata } from "next";
import { createVisitAction } from "../actions";
import { VisitForm } from "../visit-form";
import { PageHeader } from "../page-header";

export const metadata: Metadata = { title: "New visit" };

export default function NewVisitPage() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <PageHeader backHref="/" title="New visit" />
      <VisitForm action={createVisitAction} submitLabel="Start visit" cancelHref="/" />
    </main>
  );
}
