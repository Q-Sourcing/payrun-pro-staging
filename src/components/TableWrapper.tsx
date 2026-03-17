import { ReactNode } from "react";

interface TableWrapperProps {
  children: ReactNode;
  containerClassName?: string;
}

export default function TableWrapper({ children, containerClassName = "" }: TableWrapperProps) {
  return (
    <div className={`bg-card border-border rounded-xl shadow-sm overflow-hidden ${containerClassName}`}>
      <div className="overflow-x-auto max-h-full" style={{ overscrollBehaviorX: 'auto' }}>
        <table className="min-w-full border-collapse">
          {children}
        </table>
      </div>
    </div>
  );
}
