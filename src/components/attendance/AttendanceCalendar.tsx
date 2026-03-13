// @ts-nocheck
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isSameMonth } from "date-fns";

interface AttendanceRecord {
  attendance_date: string;
  status: string;
  total_hours?: number;
  is_late?: boolean;
}

interface AttendanceCalendarProps {
  records: AttendanceRecord[];
  month: Date;
  onMonthChange?: (date: Date) => void;
}

const STATUS_COLORS: Record<string, string> = {
  PRESENT: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
  ABSENT: "bg-destructive/20 text-destructive",
  LATE: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  HALF_DAY: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  LEAVE: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  SICK: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
  OFF: "bg-muted text-muted-foreground",
  PUBLIC_HOLIDAY: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-400",
  REMOTE: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400",
};

const STATUS_LABELS: Record<string, string> = {
  PRESENT: "P", ABSENT: "A", LATE: "L", HALF_DAY: "½",
  LEAVE: "LV", SICK: "S", OFF: "O", PUBLIC_HOLIDAY: "PH", REMOTE: "R",
};

export function AttendanceCalendar({ records, month }: AttendanceCalendarProps) {
  const days = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return eachDayOfInterval({ start, end });
  }, [month]);

  const recordMap = useMemo(() => {
    const map: Record<string, AttendanceRecord> = {};
    records.forEach((r) => { map[r.attendance_date] = r; });
    return map;
  }, [records]);

  const firstDayOffset = getDay(startOfMonth(month));

  // Summary stats
  const stats = useMemo(() => {
    const s = { present: 0, absent: 0, late: 0, leave: 0, totalHours: 0 };
    records.forEach((r) => {
      if (r.status === "PRESENT" || r.status === "REMOTE") s.present++;
      else if (r.status === "ABSENT") s.absent++;
      else if (r.status === "LATE") { s.late++; s.present++; }
      else if (r.status === "LEAVE" || r.status === "SICK") s.leave++;
      s.totalHours += r.total_hours || 0;
    });
    return s;
  }, [records]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            {format(month, "MMMM yyyy")}
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              {stats.present} Present
            </Badge>
            <Badge variant="outline" className="text-xs text-destructive border-destructive/30">
              {stats.absent} Absent
            </Badge>
            <Badge variant="outline" className="text-xs">
              {stats.totalHours.toFixed(1)}h Total
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOffset }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const record = recordMap[dateStr];
            const statusClass = record ? STATUS_COLORS[record.status] || "bg-muted" : "";
            const label = record ? STATUS_LABELS[record.status] || "" : "";

            return (
              <div
                key={dateStr}
                className={`relative flex flex-col items-center justify-center p-1.5 rounded-md text-xs min-h-[40px] transition-colors ${
                  statusClass || "hover:bg-muted/50"
                } ${isToday(day) ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}`}
                title={record ? `${record.status} — ${record.total_hours?.toFixed(1) || 0}h` : dateStr}
              >
                <span className="font-medium">{format(day, "d")}</span>
                {label && (
                  <span className="text-[10px] font-semibold mt-0.5">{label}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border">
          {Object.entries(STATUS_LABELS).map(([status, label]) => (
            <div key={status} className="flex items-center gap-1">
              <div className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center ${STATUS_COLORS[status]}`}>
                {label}
              </div>
              <span className="text-xs text-muted-foreground capitalize">
                {(status || "").toLowerCase().replace("_", " ")}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
