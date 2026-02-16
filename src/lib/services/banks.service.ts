// @ts-nocheck
/**
 * Banks Service
 * Service functions for managing banks
 */

import { supabase } from '@/integrations/supabase/client';

export interface Bank {
  id: string;
  name: string;
  country_code: string;
  swift_code?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateBankInput {
  name: string;
  country_code: string;
  swift_code?: string;
}

export class BanksService {
  /**
   * Get all banks for a specific country
   */
  static async getBanksByCountry(countryCode: string): Promise<Bank[]> {
    try {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .eq('country_code', countryCode)
        .order('name');

      if (error) {
        // Handle table not found gracefully
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          console.warn('Banks table not found, returning empty array');
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (error: any) {
      // If table doesn't exist, return empty array instead of throwing
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn('Banks table not found, returning empty array');
        return [];
      }
      console.warn('Error fetching banks:', error);
      // Return empty array instead of throwing to prevent app crashes
      return [];
    }
  }

  /**
   * Get all banks
   */
  static async getAllBanks(): Promise<Bank[]> {
    try {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .order('country_code, name');

      if (error) {
        // Handle table not found gracefully
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          console.warn('Banks table not found, returning empty array');
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (error: any) {
      // If table doesn't exist, return empty array instead of throwing
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn('Banks table not found, returning empty array');
        return [];
      }
      console.warn('Error fetching all banks:', error);
      // Return empty array instead of throwing to prevent app crashes
      return [];
    }
  }

  /**
   * Create a new bank
   */
  static async createBank(bankData: CreateBankInput): Promise<Bank> {
    try {
      const { data, error } = await supabase
        .from('banks')
        .insert({
          name: bankData.name.trim(),
          country_code: bankData.country_code,
          swift_code: bankData.swift_code?.trim() || null,
        })
        .select()
        .single();

      if (error) {
        // Handle unique constraint violation
        if (error.code === '23505') {
          throw new Error(`Bank "${bankData.name}" already exists for country ${bankData.country_code}`);
        }
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('Error creating bank:', error);
      if (error.message) {
        throw error;
      }
      throw new Error(`Failed to create bank: ${error.message}`);
    }
  }

  /**
   * Update a bank
   */
  static async updateBank(id: string, bankData: Partial<CreateBankInput>): Promise<Bank> {
    try {
      const updateData: any = {};
      if (bankData.name !== undefined) updateData.name = bankData.name.trim();
      if (bankData.country_code !== undefined) updateData.country_code = bankData.country_code;
      if (bankData.swift_code !== undefined) updateData.swift_code = bankData.swift_code?.trim() || null;

      const { data, error } = await supabase
        .from('banks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error updating bank:', error);
      throw new Error(`Failed to update bank: ${error.message}`);
    }
  }

  /**
   * Delete a bank
   */
  static async deleteBank(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('banks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error deleting bank:', error);
      throw new Error(`Failed to delete bank: ${error.message}`);
    }
  }
}

