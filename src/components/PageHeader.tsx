import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  filters?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions, filters }: PageHeaderProps) {
  return (
    <div className="z-20 bg-slate-50 pb-4 mb-4 border-b border-slate-200 overflow-hidden shrink-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
          {subtitle && <p className="text-slate-500 text-sm mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="w-full flex flex-wrap items-center justify-center gap-2">{actions}</div>}
      </div>
      {filters && <div className="mt-4">{filters}</div>}
    </div>
  );
}
