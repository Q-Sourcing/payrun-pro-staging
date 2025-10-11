// Types for payroll calculation Edge Function

export interface CalculationInput {
  employee_id: string;
  pay_run_id?: string;
  hours_worked?: number;
  pieces_completed?: number;
  pay_rate?: number;
  pay_type?: string;
  employee_type?: string;
  country?: string;
  custom_deductions?: Array<{
    name: string;
    amount: number;
    type: string;
  }>;
  benefit_deductions?: number;
}

export interface CalculationResult {
  gross_pay: number;
  paye_tax: number;
  nssf_employee: number;
  nssf_employer: number;
  total_deductions: number;
  net_pay: number;
  employer_contributions: number;
  breakdown: Array<{
    description: string;
    amount: number;
    type: 'addition' | 'deduction';
  }>;
  standard_deductions: { [key: string]: number };
}

export interface CalculationResponse {
  success: boolean;
  data: CalculationResult;
  employee: {
    id: string;
    name: string;
  };
}

export interface CalculationError {
  error: string;
  details?: string;
}

// Client-side service for calling the Edge Function
export class PayrollCalculationService {
  private static getFunctionUrl(): string {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('VITE_SUPABASE_URL is not configured');
    }
    return `${supabaseUrl}/functions/v1/calculate-pay`;
  }

  static async calculatePayroll(input: CalculationInput): Promise<CalculationResult> {
    try {
      const url = this.getFunctionUrl();
      
      // Get the current session token with better error handling
      const supabaseClient = (await import('@/integrations/supabase/client')).supabase;
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
      
      console.log('🔍 Debug - Session check:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        userEmail: session?.user?.email,
        sessionError: sessionError?.message
      });
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Authentication failed: Unable to get session');
      }
      
      if (!session?.access_token) {
        console.error('❌ No access token available - using fallback calculation');
        throw new Error('Authentication failed: No access token');
      }
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      };
      
      console.log('Calling Edge Function with authentication...');
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Edge Function error (${response.status}):`, errorText);
        
        let errorData: CalculationError;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: CalculationResponse = await response.json();
      
      if (!result.success) {
        throw new Error('Calculation failed');
      }

      console.log('Edge Function calculation successful:', result.data);
      return result.data;
    } catch (error) {
      console.error('Error calling payroll calculation function:', error);
      throw error;
    }
  }

  static async calculateMultiplePayroll(inputs: CalculationInput[]): Promise<CalculationResult[]> {
    const results = await Promise.allSettled(
      inputs.map(input => this.calculatePayroll(input))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Calculation failed for employee ${inputs[index].employee_id}:`, result.reason);
        throw result.reason;
      }
    });
  }
}
