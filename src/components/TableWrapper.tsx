import { ReactNode } from "react";

export default function TableWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          {children}
        </table>
      </div>
    </div>
  );
}
