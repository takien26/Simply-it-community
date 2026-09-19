export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Header Placeholder */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200 rounded-lg"></div>
          <div className="h-4 w-72 bg-slate-100 rounded"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 bg-slate-200 rounded-lg"></div>
          <div className="h-9 w-32 bg-slate-200 rounded-lg"></div>
        </div>
      </div>

      {/* Metric Cards Placeholder */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-20 bg-slate-200 rounded"></div>
              <div className="h-8 w-8 bg-slate-100 rounded-lg"></div>
            </div>
            <div className="h-6 w-16 bg-slate-200 rounded"></div>
            <div className="h-2.5 w-28 bg-slate-100 rounded"></div>
          </div>
        ))}
      </div>

      {/* Main Table / Content Card Placeholder */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="h-9 w-64 bg-slate-100 rounded-lg"></div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-20 bg-slate-100 rounded-lg"></div>
            <div className="h-9 w-20 bg-slate-100 rounded-lg"></div>
          </div>
        </div>

        {/* Table Rows Placeholder */}
        <div className="space-y-2.5 pt-2">
          <div className="h-10 bg-slate-50 rounded-lg border border-slate-100"></div>
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div key={row} className="h-12 bg-white rounded-lg border border-slate-100/80 flex items-center px-4 gap-4">
              <div className="h-4 w-12 bg-slate-100 rounded"></div>
              <div className="h-4 w-40 bg-slate-200 rounded"></div>
              <div className="h-4 w-28 bg-slate-100 rounded"></div>
              <div className="h-4 w-24 bg-slate-100 rounded hidden md:block"></div>
              <div className="h-6 w-16 bg-slate-200 rounded-full ml-auto"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
