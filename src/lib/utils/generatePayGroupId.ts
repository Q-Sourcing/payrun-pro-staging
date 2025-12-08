type GroupTypeCode = "EXPG" | "REGP" | "PCE" | "INTR";

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

/**
 * Generate a project-based PayGroup ID.
 * Format: PROJINITIALS-GROUPINITIALS-YYYYMMDDHHmm
 */
export function generateProjectPayGroupId(projectName: string, groupName: string, date = new Date()) {
  const projInitials = (projectName || "")
    .trim()
    .split(/\s+/)
    .map(w => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 3) || "PRJ";
  const groupInitials = (groupName || "")
    .trim()
    .split(/\s+/)
    .map(w => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 3) || "PG";
  const ts = date.toISOString().replace(/[-T:.Z]/g, "").slice(0, 12); // YYYYMMDDHHmm
  return `${projInitials}-${groupInitials}-${ts}`;
}
