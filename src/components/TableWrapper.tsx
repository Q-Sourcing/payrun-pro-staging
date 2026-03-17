import { ReactNode } from "react";

interface TableWrapperProps {
  children: ReactNode;
  containerClassName?: string;
}

export default function TableWrapper({ children, containerClassName = "" }: TableWrapperProps) {
  return (
    <div className={`bg-card border border-border rounded-xl shadow-sm ${containerClassName}`}>
      <div
        className="w-full overflow-x-auto overflow-y-visible"
        style={{
          overscrollBehaviorX: "contain",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-x pan-y",
          scrollbarGutter: "stable"
        }}
      >
        <table className="min-w-max w-full border-collapse">
          {children}
        </table>
      </div>
    </div>
  );
}
