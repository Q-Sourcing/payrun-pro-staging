import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ActiveProject {
  id: string;
  name: string;
  code: string;
  project_type: "manpower" | "ippms" | "expatriate";
  client_name: string | null;
  location: string | null;
  responsible_manager_id: string | null;
  responsible_manager_name?: string | null;
}

export function useActiveProjects(types?: ("manpower" | "ippms" | "expatriate")[]) {
  const [projects, setProjects] = useState<ActiveProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let q = supabase
          .from("projects")
          .select("id, name, code, project_type, client_name, location, responsible_manager_id")
          .eq("status", "active")
          .order("name");

        if (types && types.length > 0) {
          q = (q as any).in("project_type", types);
        }

        const { data, error } = await q;
        if (error) throw error;

        // Resolve manager names
        const managerIds = (data || [])
          .map((p: any) => p.responsible_manager_id)
          .filter(Boolean) as string[];

        let managerMap: Record<string, string> = {};
        if (managerIds.length > 0) {
          const { data: empData } = await supabase
            .from("employees")
            .select("id, first_name, last_name")
            .in("id", managerIds);
          (empData || []).forEach((e: any) => {
            managerMap[e.id] = [e.first_name, e.last_name].filter(Boolean).join(" ");
          });
        }

        setProjects(
          (data || []).map((p: any) => ({
            ...p,
            responsible_manager_name: p.responsible_manager_id
              ? managerMap[p.responsible_manager_id] || null
              : null,
          }))
        );
      } catch {
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [JSON.stringify(types)]);

  return { projects, loading };
}
