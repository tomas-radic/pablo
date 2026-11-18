import Link from "next/link";
import { BackIcon, iconButtonClass } from "../ui";

export function PageHeader({
  backHref,
  title,
  subtitle,
  action,
}: {
  backHref: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="-ml-2 flex items-center gap-1">
      <Link href={backHref} aria-label="Back" className={iconButtonClass}>
        <BackIcon className="size-6" />
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
