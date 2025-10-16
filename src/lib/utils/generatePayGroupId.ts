type GroupTypeCode = "EXPG" | "REGP" | "CNTR" | "INTR";

export function generatePayGroupId(type: GroupTypeCode, name: string, date = new Date()) {
  const initials = (name || "")
    .trim()
    .split(/\s+/)
    .map(w => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 3); // up to 3 initials (TP, PBS, etc.)
  const ts = date.toISOString().replace(/[-T:.Z]/g, "").slice(0, 12); // YYYYMMDDHHmm
  return `${type}-${initials || "XX"}-${ts}`;
}
