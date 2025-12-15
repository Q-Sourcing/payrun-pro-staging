import { ReactNode } from "react";

export default function TableWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="bg-card border-border rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          {children}
        </table>
      </div>
    </div>
  );
}
