import PageHeader from "@/components/PageHeader";

export default function MyPayRuns() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="My Pay Runs"
        subtitle="View and manage pay runs assigned to your sub-department"
        actions={
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            + Create Pay Run
          </button>
        }
      />

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center">
        <div className="mx-auto w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <span className="text-2xl">💰</span>
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">My Sub-Department Pay Runs</h3>
        <p className="text-slate-500 mb-6 max-w-sm mx-auto">
          This section will show only the pay runs you have permission to view and manage.
          Perfect for payroll managers and sub-department heads.
        </p>
        <button className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-200">
          Coming Soon
        </button>
      </div>
    </div>
  );
}
