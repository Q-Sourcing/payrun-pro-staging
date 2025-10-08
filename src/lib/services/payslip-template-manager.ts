import { supabase } from '@/integrations/supabase/client';
import { PayslipTemplate, PayslipTemplateConfig } from '@/lib/types/payslip';

export class PayslipTemplateManager {
  /**
   * Save a custom payslip template
   */
  static async saveTemplate(
    name: string,
    description: string,
    config: PayslipTemplateConfig,
    userId: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('payslip_templates')
        .insert({
          name,
          description,
          config,
          user_id: userId,
          is_default: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error saving payslip template:', error);
      throw error;
    }
  }

  /**
   * Get all templates for a user
   */
  static async getUserTemplates(userId: string): Promise<PayslipTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('payslip_templates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user templates:', error);
      throw error;
    }
  }

  /**
   * Get a specific template by ID
   */
  static async getTemplate(templateId: string): Promise<PayslipTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('payslip_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching template:', error);
      return null;
    }
  }

  /**
   * Update an existing template
   */
  static async updateTemplate(
    templateId: string,
    updates: Partial<PayslipTemplate>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('payslip_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }

  /**
   * Delete a template
   */
  static async deleteTemplate(templateId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('payslip_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  /**
   * Duplicate a template
   */
  static async duplicateTemplate(
    templateId: string,
    newName: string,
    userId: string
  ): Promise<string> {
    try {
      const originalTemplate = await this.getTemplate(templateId);
      if (!originalTemplate) {
        throw new Error('Template not found');
      }

      const { data, error } = await supabase
        .from('payslip_templates')
        .insert({
          name: newName,
          description: originalTemplate.description,
          config: originalTemplate.config,
          user_id: userId,
          is_default: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error duplicating template:', error);
      throw error;
    }
  }

  /**
   * Export template configuration as JSON
   */
  static exportTemplateConfig(template: PayslipTemplate): string {
    return JSON.stringify({
      name: template.name,
      description: template.description,
      config: template.config,
      exported_at: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Import template configuration from JSON
   */
  static async importTemplateConfig(
    configJson: string,
    userId: string
  ): Promise<string> {
    try {
      const templateData = JSON.parse(configJson);
      
      const { data, error } = await supabase
        .from('payslip_templates')
        .insert({
          name: templateData.name,
          description: templateData.description,
          config: templateData.config,
          user_id: userId,
          is_default: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error importing template:', error);
      throw error;
    }
  }

  /**
   * Set a template as default for the user
   */
  static async setDefaultTemplate(templateId: string, userId: string): Promise<void> {
    try {
      // First, unset all other defaults for this user
      await supabase
        .from('payslip_templates')
        .update({ is_default: false })
        .eq('user_id', userId);

      // Then set the new default
      const { error } = await supabase
        .from('payslip_templates')
        .update({ is_default: true })
        .eq('id', templateId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error setting default template:', error);
      throw error;
    }
  }

  /**
   * Get the default template for a user
   */
  static async getDefaultTemplate(userId: string): Promise<PayslipTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('payslip_templates')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .single();

      if (error) return null;
      return data;
    } catch (error) {
      console.error('Error fetching default template:', error);
      return null;
    }
  }

  /**
   * Get template usage statistics
   */
  static async getTemplateStats(templateId: string): Promise<{
    usage_count: number;
    last_used: string | null;
    created_at: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('payslip_templates')
        .select('created_at')
        .eq('id', templateId)
        .single();

      if (error) throw error;

      // Get usage count from payslip generation logs
      const { count } = await supabase
        .from('payslip_generations')
        .select('*', { count: 'exact', head: true })
        .eq('template_id', templateId);

      // Get last used date
      const { data: lastUsed } = await supabase
        .from('payslip_generations')
        .select('created_at')
        .eq('template_id', templateId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return {
        usage_count: count || 0,
        last_used: lastUsed?.created_at || null,
        created_at: data.created_at
      };
    } catch (error) {
      console.error('Error fetching template stats:', error);
      return {
        usage_count: 0,
        last_used: null,
        created_at: new Date().toISOString()
      };
    }
  }
}
