import { supabase } from "@/integrations/supabase/client";

export interface EngagementTypeOption {
  id: string;
  name: string;
  description?: string | null;
  sort_order?: number | null;
}

export interface NationalityOption {
  id: string;
  name: string;
}

export class HrCatalogsService {
  static async listEngagementTypes(): Promise<EngagementTypeOption[]> {
    const { data, error } = await (supabase as any)
      .from("engagement_types")
      .select("id, name, description, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching engagement types:", error);
      throw new Error("Failed to fetch engagement types");
    }

    return (data || []) as EngagementTypeOption[];
  }

  static async listNationalities(): Promise<NationalityOption[]> {
    const { data, error } = await (supabase as any)
      .from("nationalities")
      .select("id, name")
      .eq("active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching nationalities:", error);
      throw new Error("Failed to fetch nationalities");
    }

    return (data || []) as NationalityOption[];
  }
}
