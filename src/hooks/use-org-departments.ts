import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches department names from the sub_departments table.
 * RLS handles org-level isolation automatically.
 * Returns a deduplicated, sorted list of department name strings.
 */
export function useOrgDepartments() {
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("sub_departments" as any)
      .select("name")
      .order("name")
      .then(({ data }) => {
        const names = [
          ...new Set(
            (data ?? []).map((d: any) => d.name as string).filter(Boolean)
          ),
        ];
        setDepartments(names);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { departments, loading };
}
