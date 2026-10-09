import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children?: ReactNode;
};

/**
 * Standard page header used across discovery, match, and account surfaces.
 * Keeps title hierarchy, spacing, and optional actions consistent.
 */
export default function PageHeader({ title, description, eyebrow, actions, children }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--violet)]">
            {eyebrow}
          </p>
        )}
        <h1 className={`section-title ${eyebrow ? "mt-1" : ""}`}>{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-[var(--gray-700)]">{description}</p>
        )}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
