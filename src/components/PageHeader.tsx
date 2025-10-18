import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  filters?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions, filters }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-20 bg-slate-50 pb-4 mb-6 border-b border-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
          {subtitle && <p className="text-slate-500 text-sm mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="mt-3 sm:mt-0 flex gap-3">{actions}</div>}
      </div>
      {filters && <div className="mt-4">{filters}</div>}
    </div>
  );
}
