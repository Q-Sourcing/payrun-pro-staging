import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PayslipEmailRequest {
  employees: Array<{
    email: string;
    name: string;
    project?: string;
  }>;
  payPeriod: string;
  payslipFiles: Array<{
    filename: string;
    content: string; // base64 encoded PDF
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { employees, payPeriod, payslipFiles }: PayslipEmailRequest = await req.json();
    
    console.log(`Sending payslips to ${employees.length} employees`);
    
    const results = [];
    
    for (let i = 0; i < employees.length; i++) {
      const employee = employees[i];
      const payslipFile = payslipFiles[i];
      const project = employee.project || 'General';
      
      try {
        const emailResponse = await resend.emails.send({
          from: "Payroll <onboarding@resend.dev>",
          to: [employee.email],
          subject: `Your ${project} Payslip - ${payPeriod}`,
          html: `
            <h1>Payslip for ${payPeriod}</h1>
            <p>Dear ${employee.name},</p>
            <p>Please find attached your ${project !== 'General' ? project + ' project' : ''} payslip for the period ${payPeriod}.</p>
            <p>This payslip is confidential and intended for you only.</p>
            <br>
            <p>Best regards,<br>Payroll Team</p>
          `,
          attachments: [
            {
              filename: payslipFile.filename,
              content: payslipFile.content,
            },
          ],
        });
        
        console.log(`Sent payslip to ${employee.email}`, emailResponse);
        results.push({ email: employee.email, success: true, project });
      } catch (error: any) {
        console.error(`Failed to send to ${employee.email}:`, error);
        results.push({ email: employee.email, success: false, error: error.message, project });
      }
    }
    
    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-payslip-emails function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
