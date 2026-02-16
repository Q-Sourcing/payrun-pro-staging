import { supabase } from '@/integrations/supabase/client';
import { createBenefitSchema, updateBenefitSchema, type CreateBenefitInput, type UpdateBenefitInput, type BenefitType, type CostType } from '@/lib/validations/benefits.schema';

export type BenefitsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  benefit_type?: BenefitType;
  cost_type?: CostType;
  country?: string;
};

export interface Benefit {
  id: string;
  name: string;
  cost: number;
  cost_type: CostType;
  benefit_type: BenefitType;
  applicable_countries: string[];
  created_at: string;
  updated_at: string;
}

export class BenefitsService {
  private static readonly DEFAULT_PAGE_SIZE = 20;
  private static readonly MAX_PAGE_SIZE = 100;

  /**
   * Get benefits with pagination and filters
   */
  static async getBenefits(options: BenefitsQueryOptions = {}): Promise<{
    data: Benefit[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = this.DEFAULT_PAGE_SIZE,
      benefit_type,
      country,
      cost_type,
      search,
    } = options;

    const safeLimit = Math.min(limit, this.MAX_PAGE_SIZE);
    const from = (page - 1) * safeLimit;
    const to = from + safeLimit - 1;

    try {
      let query = supabase
        .from('benefits')
        .select('*', { count: 'exact' })
        .range(from, to)
        .order('created_at', { ascending: false });

      // Apply filters
      if (benefit_type) {
        query = query.eq('benefit_type', benefit_type);
      }

      if (cost_type) {
        query = query.eq('cost_type', cost_type);
      }

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data: benefits, error, count } = await query;

      if (error) throw error;

      // Filter by country if specified (post-query filter for array field)
      let filteredData = benefits || [];
      if (country) {
        filteredData = filteredData.filter((benefit) =>
          benefit.applicable_countries.length === 0 || benefit.applicable_countries.includes(country)
        );
      }

      return {
        data: filteredData as Benefit[],
        total: count || 0,
        page,
        limit: safeLimit,
      };
    } catch (error: any) {
      console.error('Error fetching benefits:', error);
      throw new Error(`Failed to fetch benefits: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Get benefits by country
   */
  static async getBenefitsByCountry(country: string): Promise<Benefit[]> {
    const result = await this.getBenefits({ country, limit: 1000 });
    return result.data;
  }

  /**
   * Get a single benefit by ID
   */
  static async getBenefitById(id: string): Promise<Benefit | null> {
    try {
      const { data, error } = await supabase
        .from('benefits')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data as Benefit | null;
    } catch (error: any) {
      console.error('Error fetching benefit:', error);
      throw new Error(`Failed to fetch benefit: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Create a new benefit
   */
  static async createBenefit(data: CreateBenefitInput): Promise<Benefit> {
    try {
      // Validate input
      const validatedData = createBenefitSchema.parse(data);

      const insertData: any = {
        name: validatedData.name,
        cost: validatedData.cost,
        cost_type: validatedData.cost_type,
        benefit_type: validatedData.benefit_type,
        applicable_countries: validatedData.applicable_countries || [],
      };

      const { data: benefit, error } = await supabase
        .from('benefits')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      return benefit as Benefit;
    } catch (error: any) {
      console.error('Error creating benefit:', error);
      if (error.issues) {
        // Zod validation error
        throw new Error(error.issues.map((issue: any) => issue.message).join(', '));
      }
      throw new Error(`Failed to create benefit: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Update an existing benefit
   */
  static async updateBenefit(id: string, data: UpdateBenefitInput): Promise<Benefit> {
    try {
      // Validate input
      const validatedData = updateBenefitSchema.parse({ ...data, id });

      // Check if benefit exists
      const existing = await this.getBenefitById(id);
      if (!existing) {
        throw new Error('Benefit not found');
      }

      // Prepare update data
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (validatedData.name !== undefined) updateData.name = validatedData.name;
      if (validatedData.cost !== undefined) updateData.cost = validatedData.cost;
      if (validatedData.cost_type !== undefined) updateData.cost_type = validatedData.cost_type;
      if (validatedData.benefit_type !== undefined) updateData.benefit_type = validatedData.benefit_type;
      if (validatedData.applicable_countries !== undefined) updateData.applicable_countries = validatedData.applicable_countries;

      const { data: benefit, error } = await supabase
        .from('benefits')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return benefit as Benefit;
    } catch (error: any) {
      console.error('Error updating benefit:', error);
      if (error.issues) {
        // Zod validation error
        throw new Error(error.issues.map((issue: any) => issue.message).join(', '));
      }
      throw new Error(`Failed to update benefit: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Delete a benefit
   */
  static async deleteBenefit(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('benefits')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error deleting benefit:', error);
      throw new Error(`Failed to delete benefit: ${error?.message || 'Unknown error'}`);
    }
  }
}

