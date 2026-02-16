// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import type {
  PayGroup,
  PayGroupFormData,
  PayGroupSummary,
  PayGroupType,
  RegularPayGroup,
  ExpatriatePayGroup,
  PieceRatePayGroup,
  InternPayGroup,
  PayGroupCategory,
  HeadOfficeSubType,
  ProjectsSubType,
  ManpowerFrequency
} from '@/lib/types/paygroups';
import { generatePayGroupId } from '@/lib/types/paygroups';

export class PayGroupsService {
  /**
   * Get all pay groups with summary information
   */
  static async getPayGroups(): Promise<PayGroup[]> {
    try {
      // Fetch regular pay groups
      const { data: regularGroups, error: regularError } = await (supabase
        .from('pay_groups' as any)
        .select(`
          *,
          employees(count)
        `) as any)
        .order('created_at', { ascending: false });

      if (regularError) throw regularError;

      // Fetch expatriate pay groups
      const { data: expatriateGroups, error: expatriateError } = await (supabase
        .from('expatriate_pay_groups' as any)
        .select(`
          *,
          expatriate_pay_run_items(count)
        `) as any)
        .order('created_at', { ascending: false });

      if (expatriateError) throw expatriateError;

      // Fetch new Head Office pay groups
      const [
        { data: hoRegular },
        { data: hoInterns },
        { data: hoExpatriates },
        { data: hoMembers, error: hoMembersError }
      ] = await Promise.all([
        supabase.from('head_office_pay_groups_regular' as any).select('*').eq('status', 'active') as any,
        supabase.from('head_office_pay_groups_interns' as any).select('*').eq('status', 'active') as any,
        supabase.from('head_office_pay_groups_expatriates' as any).select('*').eq('status', 'active') as any,
        supabase.from('head_office_pay_group_members' as any).select('pay_group_id').eq('active', true) as any
      ]);

      // Create a map of pay_group_id to member count for Head Office
      const hoCountMap = new Map<string, number>();
      if (!hoMembersError && hoMembers) {
        hoMembers.forEach((member: any) => {
          const count = hoCountMap.get(member.pay_group_id) || 0;
          hoCountMap.set(member.pay_group_id, count + 1);
        });
      }

      // Map regular groups
      const regularPayGroups: RegularPayGroup[] = (regularGroups || []).map(group => ({
        id: group.id,
        paygroup_id: `REGP-${group.country.substring(0, 1)}${group.id.substring(0, 3)}`,
        name: group.name,
        type: 'regular' as const,
        category: group.category,
        // Map legacy 'local' to 'regular' for consistency
        employee_type: group.employee_type === 'local' ? 'regular' : group.employee_type,
        pay_frequency: group.pay_frequency,
        country: group.country,
        currency: 'UGX',
        status: 'active' as const,
        employee_count: group.employees?.[0]?.count || 0,
        created_at: group.created_at,
        updated_at: group.updated_at,
        notes: group.description,
        default_tax_percentage: group.default_tax_percentage,
        tax_country: group.tax_country || group.country
      }));

      // Map expatriate groups
      const expatriatePayGroups: ExpatriatePayGroup[] = (expatriateGroups || []).map(group => ({
        id: group.id,
        paygroup_id: `EXPG-${group.country.substring(0, 1)}${group.id.substring(0, 3)}`,
        name: group.name,
        type: 'expatriate' as const,
        category: group.category,
        employee_type: group.employee_type,
        country: group.country,
        currency: group.currency,
        status: 'active' as const,
        employee_count: group.expatriate_pay_run_items?.[0]?.count || 0,
        created_at: group.created_at,
        updated_at: group.updated_at,
        notes: group.notes,
        exchange_rate_to_local: group.exchange_rate_to_local,
        default_daily_rate: group.default_daily_rate,
        tax_country: group.tax_country
      }));

      // Map Head Office regular
      const hoRegularGroups: PayGroup[] = (hoRegular || []).map(group => ({
        id: group.id,
        paygroup_id: `HORG-${group.id.substring(0, 4)}`,
        name: group.name,
        type: 'regular' as const,
        category: 'head_office' as const,
        employee_type: 'regular' as const,
        pay_frequency: group.pay_frequency,
        country: 'UG',
        currency: 'UGX',
        status: 'active' as const,
        employee_count: hoCountMap.get(group.id) || 0,
        created_at: group.created_at,
        updated_at: group.updated_at,
        notes: group.notes,
        default_tax_percentage: 0, // HO doesn't use this currently
        tax_country: 'UG'
      } as any));

      // Map Head Office interns
      const hoInternGroups: PayGroup[] = (hoInterns || []).map(group => ({
        id: group.id,
        paygroup_id: `HOIN-${group.id.substring(0, 4)}`,
        name: group.name,
        type: 'intern' as const,
        category: 'head_office' as const,
        employee_type: 'interns' as const,
        pay_frequency: group.pay_frequency,
        country: 'UG',
        currency: 'UGX',
        status: 'active' as const,
        employee_count: hoCountMap.get(group.id) || 0,
        created_at: group.created_at,
        updated_at: group.updated_at,
        notes: group.notes,
        internship_duration: 0,
        stipend_amount: 0,
        tax_country: 'UG'
      } as any));

      // Map Head Office expatriates
      const hoExpatGroups: PayGroup[] = (hoExpatriates || []).map(group => ({
        id: group.id,
        paygroup_id: `HOEX-${group.id.substring(0, 4)}`,
        name: group.name,
        type: 'expatriate' as const,
        category: 'head_office' as const,
        employee_type: 'expatriate' as const,
        pay_frequency: group.pay_frequency,
        country: 'UG',
        currency: group.currency || 'USD',
        status: 'active' as const,
        employee_count: hoCountMap.get(group.id) || 0,
        created_at: group.created_at,
        updated_at: group.updated_at,
        notes: group.notes,
        exchange_rate_to_local: group.exchange_rate_to_local,
        default_daily_rate: group.default_daily_rate || 0,
        tax_country: group.tax_country || 'UG'
      } as any));

      return [
        ...regularPayGroups,
        ...expatriatePayGroups,
        ...hoRegularGroups,
        ...hoInternGroups,
        ...hoExpatGroups
      ];
    } catch (error) {
      console.error('Error fetching pay groups:', error);
      throw new Error(`Failed to fetch pay groups: ${error.message}`);
    }
  }

  /**
   * Get pay groups linked to a specific project
   */
  static async getPayGroupsByProject(projectId: string, organizationId?: string): Promise<PayGroup[]> {
    try {
      let query = supabase
        .from('pay_groups' as any)
        .select('*')
        .eq('category', 'projects')
        .eq('project_id', projectId)
        .order('name');
      if (organizationId) {
        query = (query as any).eq('organization_id', organizationId);
      }
      const { data, error } = await (query as any);
      if (error) throw error;
      return (data || []).map(group => ({
        id: group.id,
        paygroup_id: `REGP-${group.country?.substring(0, 1)}${group.id.substring(0, 3)}`,
        name: group.name,
        type: 'regular' as const,
        category: group.category,
        employee_type: group.employee_type,
        pay_frequency: group.pay_frequency,
        country: group.country,
        currency: 'UGX',
        status: 'active' as const,
        employee_count: 0,
        created_at: group.created_at,
        updated_at: group.updated_at,
        notes: group.description,
        default_tax_percentage: group.default_tax_percentage,
        tax_country: group.tax_country || group.country
      }));
    } catch (error: any) {
      console.error('Error fetching pay groups by project:', error);
      throw new Error(`Failed to fetch pay groups for project: ${error.message}`);
    }
  }
  /**
   * Get pay groups by category and employee_type
   */
  static async getPayGroupsByCategory(
    category: PayGroupCategory,
    employeeType?: HeadOfficeSubType | ProjectsSubType,
    payFrequency?: ManpowerFrequency
  ): Promise<PayGroup[]> {
    const allGroups = await this.getPayGroups();
    return allGroups.filter(group => {
      if (group.category !== category) return false;
      if (employeeType && group.employee_type !== employeeType) return false;
      if (payFrequency && group.pay_frequency !== payFrequency) return false;
      return true;
    });
  }

  /**
   * Get pay groups grouped by category and employee_type
   */
  static async getPayGroupsGrouped(): Promise<{
    head_office: {
      regular: PayGroup[];
      expatriate: PayGroup[];
      interns: PayGroup[];
    };
    projects: {
      manpower: {
        daily: PayGroup[];
        bi_weekly: PayGroup[];
        monthly: PayGroup[];
      };
      ippms: PayGroup[];
      expatriate: PayGroup[];
    };
  }> {
    const allGroups = await this.getPayGroups();

    return {
      head_office: {
        regular: allGroups.filter(g => g.category === 'head_office' && g.employee_type === 'regular'),
        expatriate: allGroups.filter(g => g.category === 'head_office' && g.employee_type === 'expatriate'),
        interns: allGroups.filter(g => g.category === 'head_office' && g.employee_type === 'interns')
      },
      projects: {
        manpower: {
          daily: allGroups.filter(g => g.category === 'projects' && g.employee_type === 'manpower' && g.pay_frequency === 'daily'),
          bi_weekly: allGroups.filter(g => g.category === 'projects' && g.employee_type === 'manpower' && g.pay_frequency === 'bi_weekly'),
          monthly: allGroups.filter(g => g.category === 'projects' && g.employee_type === 'manpower' && g.pay_frequency === 'monthly')
        },
        ippms: allGroups.filter(g => g.category === 'projects' && g.employee_type === 'ippms'),
        expatriate: allGroups.filter(g => g.category === 'projects' && g.employee_type === 'expatriate')
      }
    };
  }

  /**
   * Get pay groups filtered by project type and pay type
   * Used for employee creation flow
   */
  static async getFilteredProjectPayGroups(
    projectType: string,
    payType: string,
    projectId?: string
  ): Promise<PayGroup[]> {
    try {
      // Query pay_groups table for project-based pay groups
      let query = supabase
        .from('pay_groups' as any)
        .select('*')
        .eq('category', 'projects');

      // Filter by project_type if available
      if (projectType) {
        // Map employee type to project type if needed
        const projectTypeMapping: Record<string, string> = {
          'regular': 'manpower',
          'manpower': 'manpower',
          'ippms': 'ippms',
          'expatriate': 'expatriate'
        };
        const mappedProjectType = projectTypeMapping[projectType] || projectType;
        query = query.eq('project_type', mappedProjectType);
      }

      // Filter by pay_type
      if (payType) {
        query = query.eq('pay_type', payType);
      }

      // Optionally filter by specific project
      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await (query as any).order('name');

      if (error) {
        console.error('Error fetching filtered pay groups:', error);
        throw error;
      }

      // Transform to PayGroup format
      const payGroups: PayGroup[] = (data || []).map(group => ({
        id: group.id,
        paygroup_id: `REGP-${group.country?.substring(0, 1)}${group.id.substring(0, 3)}`,
        name: group.name,
        type: 'regular' as const,
        category: group.category,
        employee_type: group.employee_type,
        pay_frequency: group.pay_frequency,
        country: group.country,
        currency: 'UGX',
        status: 'active' as const,
        employee_count: 0,
        created_at: group.created_at,
        updated_at: group.updated_at,
        notes: group.description,
        default_tax_percentage: group.default_tax_percentage,
        tax_country: group.tax_country || group.country
      }));

      return payGroups;
    } catch (error) {
      console.error('Error in getFilteredProjectPayGroups:', error);
      throw new Error(`Failed to fetch filtered pay groups: ${error.message}`);
    }
  }

  /**
   * Get pay groups for a specific project with comprehensive filtering
   * Used for PayRun creation flow
   */
  static async getProjectPayGroups({
    organizationId,
    projectId,
    employeeType,
    payType,
    payFrequency
  }: {
    organizationId?: string;
    projectId: string;
    employeeType: 'manpower' | 'ippms' | 'expatriate';
    payType?: string;
    payFrequency?: string;
  }): Promise<PayGroup[]> {
    try {
      // Build query for project-based pay groups
      let query = supabase
        .from('pay_groups' as any)
        .select('*')
        .eq('category', 'projects')
        .eq('project_id', projectId)
        .eq('employee_type', employeeType);

      // Add organization filter if provided
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      // Filter by pay_type if provided (for IPPMS: piece_rate or daily_rate)
      if (payType) {
        query = query.eq('pay_type', payType);
      }

      // Filter by pay_frequency if provided (for Manpower: daily, bi_weekly, monthly)
      if (payFrequency) {
        query = query.eq('pay_frequency', payFrequency);
      }

      // Order by creation date (newest first)
      query = query.order('created_at', { ascending: false });

      const { data, error } = await (query as any);

      if (error) {
        console.error('Error fetching project pay groups:', error);
        throw error;
      }

      // Transform to PayGroup format
      const payGroups: PayGroup[] = ((data as any) || []).map((group: any) => ({
        id: group.id,
        paygroup_id: `PROJ-${group.project_id?.substring(0, 4)}-${group.id.substring(0, 4)}`,
        name: group.name,
        type: employeeType === 'ippms' && payType === 'piece_rate' ? 'piece_rate' as const : 'regular' as const,
        category: group.category,
        employee_type: group.employee_type,
        pay_frequency: group.pay_frequency,
        pay_type: group.pay_type,
        country: group.country,
        currency: 'UGX',
        status: 'active' as const,
        employee_count: 0,
        created_at: group.created_at,
        updated_at: group.updated_at,
        notes: group.description,
        default_tax_percentage: group.default_tax_percentage,
        tax_country: group.tax_country || group.country,
        project_id: group.project_id,
        source_table: 'pay_groups',
        source_id: group.id,
        // Piece rate fields
        piece_type: group.piece_type,
        default_piece_rate: group.default_piece_rate,
        minimum_pieces: group.minimum_pieces,
        maximum_pieces: group.maximum_pieces
      }));

      return payGroups;
    } catch (error) {
      console.error('Error in getProjectPayGroups:', error);
      throw new Error(`Failed to fetch project pay groups: ${error.message}`);
    }
  }

  /**
   * Get pay groups by type
   */
  static async getPayGroupsByType(type: PayGroupType): Promise<PayGroup[]> {
    const allGroups = await this.getPayGroups();
    return allGroups.filter(group => group.type === type);
  }

  /**
   * Get pay group summary statistics
   */
  static async getPayGroupSummary(): Promise<PayGroupSummary> {
    try {
      const groups = await this.getPayGroups();

      const summary: PayGroupSummary = {
        totalGroups: groups.length,
        activeGroups: groups.filter(g => g.status === 'active').length,
        totalEmployees: groups.reduce((sum, g) => sum + g.employee_count, 0),
        currencies: [...new Set(groups.map(g => g.currency))],
        types: [...new Set(groups.map(g => g.type))]
      };

      return summary;
    } catch (error) {
      console.error('Error fetching pay group summary:', error);
      throw new Error(`Failed to fetch pay group summary: ${error.message}`);
    }
  }

  /**
   * Create a new pay group
   */
  static async createPayGroup(formData: PayGroupFormData, organizationId?: string): Promise<PayGroup> {
    try {
      const paygroup_id = generatePayGroupId(formData.type, formData.country);
      const orgId = organizationId || (typeof window !== 'undefined' ? localStorage.getItem('active_organization_id') || undefined : undefined);

      if (formData.type === 'regular') {
        const { data, error } = await supabase
          .from('pay_groups' as any)
          .insert([{
            name: formData.name,
            country: formData.country,
            category: formData.category || 'head_office',
            employee_type: formData.employee_type || 'regular',
            // Pay frequency is restricted to Manpower by DB constraint ck_pay_frequency, so Regular must be null
            pay_frequency: null,
            default_tax_percentage: formData.default_tax_percentage,
            description: formData.notes,
            tax_country: formData.tax_country || formData.country,
            organization_id: orgId || null,
            // Project-aware fields for project-based regular groups
            project_id: formData.category === 'projects' ? (formData as any).project_id || null : null,
            project_type: formData.category === 'projects'
              ? (formData.employee_type === 'manpower' || formData.employee_type === 'ippms' || formData.employee_type === 'expatriate'
                ? (formData.employee_type as any)
                : null)
              : null
          }] as any)
          .select()
          .single();

        if (error) {
          console.error('Supabase error:', error);
          throw new Error(this.getValidationErrorMessage(error));
        }

        // Add to pay_group_master for unified lookup
        if ((data as any)?.id) {
          await supabase
            .from('pay_group_master' as any)
            .upsert({
              type: 'regular',
              source_table: 'pay_groups',
              source_id: (data as any).id,
              code: null,
              name: (data as any).name,
              country: (data as any).country,
              currency: 'UGX',
              active: true,
              category: (data as any).category,
              pay_frequency: (data as any).pay_frequency || null,
              organization_id: (data as any).organization_id
            } as any, { onConflict: 'type,source_table,source_id' } as any);
        }

        return {
          id: (data as any).id,
          paygroup_id,
          name: (data as any).name,
          type: 'regular',
          category: (data as any).category,
          employee_type: (data as any).employee_type,
          pay_frequency: (data as any).pay_frequency,
          country: (data as any).country,
          currency: 'UGX',
          status: 'active',
          employee_count: 0,
          created_at: (data as any).created_at,
          updated_at: (data as any).updated_at,
          notes: (data as any).description,
          default_tax_percentage: (data as any).default_tax_percentage
        } as RegularPayGroup;
      }

      if (formData.type === 'expatriate') {
        // Determine category based on formData or default to head_office
        const category = formData.category || 'head_office';
        const employeeType = formData.employee_type || 'expatriate';

        const { data, error } = await supabase
          .from('expatriate_pay_groups' as any)
          .insert([{
            paygroup_id,
            name: formData.name,
            country: formData.country,
            currency: formData.currency,
            exchange_rate_to_local: formData.exchange_rate_to_local,
            tax_country: formData.tax_country,
            notes: formData.notes,
            organization_id: orgId || null
          }] as any)
          .select()
          .single();

        if (error) {
          console.error('Supabase error:', error);
          throw new Error(this.getValidationErrorMessage(error));
        }

        // Ensure pay_group_master reflects expatriate metadata
        if (data && (data as any).id) {
          await supabase
            .from('pay_group_master' as any)
            .upsert({
              type: 'expatriate',
              source_table: 'expatriate_pay_groups',
              source_id: (data as any).id,
              code: (data as any).paygroup_id,
              name: (data as any).name,
              country: (data as any).country,
              currency: (data as any).currency,
              active: true,
              category,
              employee_type: employeeType,
              organization_id: (data as any).organization_id
            } as any, { onConflict: 'type,source_table,source_id' } as any);
        }

        return {
          id: (data as any).id,
          paygroup_id: (data as any).paygroup_id,
          name: (data as any).name,
          type: 'expatriate',
          category,
          employee_type: employeeType,
          country: (data as any).country,
          currency: (data as any).currency,
          status: 'active',
          employee_count: 0,
          created_at: (data as any).created_at,
          updated_at: (data as any).updated_at,
          notes: (data as any).notes,
          exchange_rate_to_local: (data as any).exchange_rate_to_local,
          tax_country: (data as any).tax_country
        } as ExpatriatePayGroup;
      }

      if (formData.type === 'piece_rate') {
        // IPPMS pay groups - category must be 'projects' and employee_type must be 'ippms'
        const category = formData.category || 'projects';
        const employeeType = formData.employee_type || 'ippms';

        const { data, error } = await supabase
          .from('pay_groups' as any)
          .insert([{
            name: formData.name,
            country: formData.country,
            category: category,
            employee_type: employeeType,
            pay_type: formData.pay_type || 'piece_rate',
            pay_frequency: formData.pay_frequency || null,
            default_tax_percentage: formData.default_tax_percentage || 30,
            tax_country: formData.tax_country || 'UG',
            description: formData.notes || null,
            // Piece rate specific fields
            piece_type: formData.piece_type || 'units',
            default_piece_rate: formData.default_piece_rate || 0,
            minimum_pieces: formData.minimum_pieces || null,
            maximum_pieces: formData.maximum_pieces || null,
            organization_id: orgId || null,
            // Project-aware fields
            project_id: (formData as any).project_id || null,
            project_type: 'ippms'
          }] as any)
          .select()
          .single();

        if (error) {
          console.error('Supabase error:', error);
          throw new Error(this.getValidationErrorMessage(error));
        }

        // Ensure pay_group_master reflects IPPMS metadata including pay_type
        if ((data as any)?.id) {
          await supabase
            .from('pay_group_master' as any)
            .upsert({
              type: 'regular', // keep master type compatible; filtering uses employee_type/pay_type
              source_table: 'pay_groups',
              source_id: (data as any).id,
              code: null,
              name: (data as any).name,
              country: (data as any).country,
              currency: formData.currency || 'UGX',
              active: true,
              category,
              employee_type: employeeType,
              pay_frequency: formData.pay_frequency || null,
              pay_type: formData.pay_type || 'piece_rate',
              organization_id: (data as any).organization_id
            } as any, { onConflict: 'type,source_table,source_id' } as any);
        }

        return {
          id: (data as any).id,
          paygroup_id,
          name: (data as any).name,
          type: 'piece_rate',
          category: (data as any).category,
          employee_type: (data as any).employee_type,
          pay_type: (data as any).pay_type || formData.pay_type || 'piece_rate',
          pay_frequency: (data as any).pay_frequency,
          country: (data as any).country,
          currency: formData.currency || 'UGX',
          status: 'active',
          employee_count: 0,
          created_at: (data as any).created_at,
          updated_at: (data as any).updated_at,
          notes: (data as any).description,
          default_tax_percentage: (data as any).default_tax_percentage,
          tax_country: (data as any).tax_country,
          piece_type: (data as any).piece_type || formData.piece_type,
          default_piece_rate: (data as any).default_piece_rate || formData.default_piece_rate || 0,
          minimum_pieces: (data as any).minimum_pieces || formData.minimum_pieces,
          maximum_pieces: (data as any).maximum_pieces || formData.maximum_pieces
        } as PieceRatePayGroup;
      }

      if (formData.type === 'intern') {
        const category = formData.category || 'head_office';
        const employeeType = formData.employee_type || 'interns';

        const { data, error } = await supabase
          .from('pay_groups' as any)
          .insert([{
            name: formData.name,
            country: formData.country,
            category: category,
            employee_type: employeeType,
            pay_frequency: null,
            default_tax_percentage: 0,
            description: formData.notes,
            tax_country: formData.tax_country || formData.country,
            organization_id: orgId || null
          }] as any)
          .select()
          .single();

        if (error) {
          console.error('Supabase error:', error);
          throw new Error(this.getValidationErrorMessage(error));
        }

        // Add to pay_group_master
        if ((data as any)?.id) {
          await supabase
            .from('pay_group_master' as any)
            .upsert({
              type: 'intern',
              source_table: 'pay_groups',
              source_id: (data as any).id,
              code: null,
              name: (data as any).name,
              country: (data as any).country,
              currency: 'UGX',
              active: true,
              category,
              employee_type: employeeType,
              organization_id: (data as any).organization_id
            } as any, { onConflict: 'type,source_table,source_id' } as any);
        }

        return {
          id: (data as any).id,
          paygroup_id,
          name: (data as any).name,
          type: 'intern',
          category,
          employee_type: employeeType,
          country: (data as any).country,
          currency: 'UGX',
          status: 'active',
          employee_count: 0,
          created_at: (data as any).created_at,
          updated_at: (data as any).updated_at,
          notes: (data as any).description,
          default_tax_percentage: 0
        } as any;
      }
    } catch (error) {
      console.error('Error creating pay group:', error);
      if (error.message.includes('Failed to create')) {
        throw error;
      }
      throw new Error(`Failed to create pay group: ${error.message}`);
    }
  }

  /**
   * Update an existing pay group
   */
  static async updatePayGroup(id: string, type: PayGroupType, formData: Partial<PayGroupFormData>): Promise<PayGroup> {
    try {
      if (type === 'regular') {
        const { data, error } = await supabase
          .from('pay_groups' as any)
          .update({
            name: formData.name,
            country: formData.country,
            category: formData.category,
            employee_type: formData.employee_type,
            pay_frequency: formData.pay_frequency,
            default_tax_percentage: formData.default_tax_percentage,
            description: formData.notes
          } as any)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Supabase error:', error);
          throw new Error(this.getValidationErrorMessage(error));
        }

        return {
          id: (data as any).id,
          paygroup_id: `REGP-${(data as any).country.substring(0, 1)}${(data as any).id.substring(0, 3)}`,
          name: (data as any).name,
          type: 'regular',
          category: (data as any).category,
          employee_type: (data as any).employee_type,
          pay_frequency: (data as any).pay_frequency,
          country: (data as any).country,
          currency: 'UGX',
          status: 'active',
          employee_count: 0, // Would need to fetch separately
          created_at: (data as any).created_at,
          updated_at: (data as any).updated_at,
          notes: (data as any).description,
          default_tax_percentage: (data as any).default_tax_percentage
        } as RegularPayGroup;
      }

      if (type === 'expatriate') {
        const category = formData.category;
        const employeeType = formData.employee_type;

        const { data, error } = await supabase
          .from('expatriate_pay_groups' as any)
          .update({
            name: formData.name,
            country: formData.country,
            currency: formData.currency,
            exchange_rate_to_local: formData.exchange_rate_to_local,
            default_daily_rate: formData.default_daily_rate,
            tax_country: formData.tax_country,
            notes: formData.notes
          } as any)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Supabase error:', error);
          throw new Error(this.getValidationErrorMessage(error));
        }

        // Update pay_group_master with category/employee_type if provided
        if (category && employeeType) {
          await supabase
            .from('pay_group_master' as any)
            .update({
              category,
              employee_type: employeeType
            } as any)
            .eq('source_table', 'expatriate_pay_groups')
            .eq('source_id', id);
        }

        return {
          id: (data as any).id,
          paygroup_id: `EXPG-${(data as any).country.substring(0, 1)}${(data as any).id.substring(0, 3)}`,
          name: (data as any).name,
          type: 'expatriate',
          category: category || 'head_office',
          employee_type: employeeType || 'expatriate',
          country: (data as any).country,
          currency: (data as any).currency,
          status: 'active',
          employee_count: 0, // Would need to fetch separately
          created_at: (data as any).created_at,
          updated_at: (data as any).updated_at,
          notes: (data as any).notes,
          exchange_rate_to_local: (data as any).exchange_rate_to_local,
          default_daily_rate: (data as any).default_daily_rate,
          tax_country: (data as any).tax_country
        } as ExpatriatePayGroup;
      }

      throw new Error(`Pay group type '${type}' update is not yet implemented`);
    } catch (error) {
      console.error('Error updating pay group:', error);
      if (error.message.includes('Failed to update')) {
        throw error;
      }
      throw new Error(`Failed to update pay group: ${error.message}`);
    }
  }

  /**
   * Delete a pay group
   */
  static async deletePayGroup(id: string, type: PayGroupType): Promise<void> {
    try {
      let tableName: string;

      switch (type) {
        case 'regular':
          tableName = 'pay_groups';
          break;
        case 'expatriate':
          tableName = 'expatriate_pay_groups';
          break;
        default:
          throw new Error(`Pay group type '${type}' deletion is not yet implemented`);
      }

      const { error } = await supabase
        .from(tableName as any)
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(this.getValidationErrorMessage(error));
      }
    } catch (error) {
      console.error('Error deleting pay group:', error);
      if (error.message.includes('Failed to delete')) {
        throw error;
      }
      throw new Error(`Failed to delete pay group: ${error.message}`);
    }
  }

  /**
   * Get detailed validation error messages from Supabase
   */
  private static getValidationErrorMessage(error: any): string {
    if (error.code === '23505') { // Unique constraint violation
      return 'A pay group with this name already exists';
    }

    if (error.code === '23503') { // Foreign key constraint violation
      return 'Cannot delete pay group: it has associated employees';
    }

    if (error.code === '23514') { // Check constraint violation
      return 'Invalid data: please check all required fields';
    }

    if (error.message) {
      // Extract field-specific errors
      if (error.message.includes('name')) {
        return 'Pay group name is required';
      }
      if (error.message.includes('country')) {
        return 'Country selection is required';
      }
      if (error.message.includes('exchange_rate')) {
        return 'Exchange rate must be a positive number';
      }
      if (error.message.includes('daily_rate')) {
        return 'Daily rate must be a positive number';
      }
      if (error.message.includes('tax_percentage')) {
        return 'Tax percentage must be between 0 and 100';
      }
    }

    return error.message || 'An unexpected error occurred';
  }

  /**
   * Validate pay group form data
   */
  static validatePayGroupData(formData: PayGroupFormData): string[] {
    const errors: string[] = [];

    // Common validations
    if (!formData.name?.trim()) {
      errors.push('Pay group name is required');
    }

    if (!formData.country) {
      errors.push('Country selection is required');
    }

    if (!formData.currency) {
      errors.push('Currency selection is required');
    }

    // Project-based validations
    if (formData.category === 'projects') {
      if (!('project_id' in formData) || !(formData as any).project_id) {
        errors.push('Project selection is required for project-based pay groups');
      }
      if (!formData.employee_type) {
        errors.push('Employee type is required for project-based pay groups');
      }
    }

    // Type-specific validations
    if (formData.type === 'regular') {
      // Pay frequency check removed as DB constraint only allows it for Manpower
      /*
      if (!formData.pay_frequency) {
        errors.push('Pay frequency is required for regular pay groups');
      }
      */

      if (formData.default_tax_percentage === undefined || formData.default_tax_percentage < 0 || formData.default_tax_percentage > 100) {
        errors.push('Tax percentage must be between 0 and 100');
      }
    }

    if (formData.type === 'expatriate') {
      if (!formData.exchange_rate_to_local || formData.exchange_rate_to_local <= 0) {
        errors.push('Exchange rate must be a positive number');
      }

      if (!formData.tax_country) {
        errors.push('Tax country is required for expatriate pay groups');
      }
    }

    return errors;
  }
}
