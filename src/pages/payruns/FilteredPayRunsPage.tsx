import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, DollarSign, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import CreatePayRunDialog from '@/components/payroll/CreatePayRunDialog';
import PayRunDetailsDialog from '@/components/payroll/PayRunDetailsDialog';
import { format } from 'date-fns';
import { PayGroupCategory, HeadOfficeSubType, ProjectsSubType, ManpowerFrequency } from '@/lib/types/paygroups';

interface PayRun {
  id: string;
  pay_run_date: string;
  pay_period_start: string;
  pay_period_end: string;
  status: string;
  total_gross_pay: number;
  total_deductions: number;
  total_net_pay: number;
  category?: string;
  sub_type?: string;
  pay_frequency?: string;
  pay_group_master: {
    name: string;
    country: string;
    currency?: string;
    code?: string;
    type: string;
  };
  pay_items_count?: number;
}

interface FilteredPayRunsPageProps {
  category: PayGroupCategory;
  subType?: HeadOfficeSubType | ProjectsSubType;
  payFrequency?: ManpowerFrequency;
  title: string;
  description: string;
}

// Helper function to map subType to payrollType
const getPayrollTypeFromSubType = (subType?: string): string | undefined => {
  if (!subType) return undefined;
  const mapping: Record<string, string> = {
    'regular': 'Local',
    'expatriate': 'Expatriate',
    'interns': 'Local',
  };
  return mapping[subType.toLowerCase()];
};

const FilteredPayRunsPage: React.FC<FilteredPayRunsPageProps> = ({
  category,
  subType,
  payFrequency,
  title,
  description
}) => {
  const [payRuns, setPayRuns] = useState<PayRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedPayRun, setSelectedPayRun] = useState<PayRun | null>(null);
  const { toast } = useToast();

  // Determine payroll type from subType
  const payrollType = getPayrollTypeFromSubType(subType);

  useEffect(() => {
    fetchPayRuns();
  }, [category, subType, payFrequency]);

  const fetchPayRuns = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("pay_runs")
        .select(`
          *,
          pay_group_master:pay_group_master_id (
            name,
            country,
            currency,
            code,
            type
          ),
          pay_items (count)
        `)
        .eq("category", category);

      if (subType) {
        query = query.eq("sub_type", subType);
      }

      if (payFrequency) {
        query = query.eq("pay_frequency", payFrequency);
      }

      const { data, error } = await query.order("pay_run_date", { ascending: false });

      if (error) throw error;

      const payRunsWithCount = data?.map(run => ({
        ...run,
        pay_items_count: run.pay_items?.[0]?.count || 0
      })) || [];

      setPayRuns(payRunsWithCount);
    } catch (err) {
      console.error("Error fetching pay runs:", err);
      toast({
        title: "Error",
        description: "Failed to fetch pay runs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-yellow-100 text-yellow-800";
      case "pending_approval": return "bg-orange-100 text-orange-800";
      case "approved": return "bg-green-100 text-green-800";
      case "processed": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading pay runs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Pay Run
        </Button>
      </div>

      {payRuns.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Pay Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Pay Period</TableHead>
                  <TableHead>Pay Group</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Gross Pay</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>{format(new Date(run.pay_run_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      {format(new Date(run.pay_period_start), 'MMM dd')} - {format(new Date(run.pay_period_end), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>{run.pay_group_master?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(run.status)}>
                        {formatStatus(run.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {run.pay_group_master?.currency || 'UGX'} {run.total_gross_pay?.toLocaleString() || '0'}
                    </TableCell>
                    <TableCell>
                      {run.pay_group_master?.currency || 'UGX'} {run.total_net_pay?.toLocaleString() || '0'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPayRun(run);
                          setShowDetailsDialog(true);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No pay runs found for this category.</p>
            <Button onClick={() => setShowCreateDialog(true)} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create Pay Run
            </Button>
          </CardContent>
        </Card>
      )}

      <CreatePayRunDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchPayRuns}
        payrollType={payrollType}
        defaultCategory={category}
        defaultSubType={subType}
        defaultPayFrequency={payFrequency}
      />

      {selectedPayRun && (
        <PayRunDetailsDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          payRunId={selectedPayRun.id}
          onUpdate={fetchPayRuns}
        />
      )}
    </div>
  );
};

// Head Office Pay Run Pages
export const HeadOfficeRegularPayRunsPage = () => (
  <FilteredPayRunsPage
    category="head_office"
    subType="regular"
    title="Head Office - Regular Pay Runs"
    description="Manage regular payroll runs for head office employees"
  />
);

export const HeadOfficeExpatriatePayRunsPage = () => (
  <FilteredPayRunsPage
    category="head_office"
    subType="expatriate"
    title="Head Office - Expatriate Pay Runs"
    description="Manage expatriate payroll runs for head office"
  />
);

export const HeadOfficeInternsPayRunsPage = () => (
  <FilteredPayRunsPage
    category="head_office"
    subType="interns"
    title="Head Office - Interns Pay Runs"
    description="Manage intern payroll runs for head office"
  />
);

// Projects Pay Run Pages
export const ProjectsManpowerDailyPayRunsPage = () => (
  <FilteredPayRunsPage
    category="projects"
    subType="manpower"
    payFrequency="daily"
    title="Projects - Manpower Daily Pay Runs"
    description="Manage daily manpower payroll runs for projects"
  />
);

export const ProjectsManpowerBiWeeklyPayRunsPage = () => (
  <FilteredPayRunsPage
    category="projects"
    subType="manpower"
    payFrequency="bi_weekly"
    title="Projects - Manpower Bi-weekly Pay Runs"
    description="Manage bi-weekly manpower payroll runs for projects"
  />
);

export const ProjectsManpowerMonthlyPayRunsPage = () => (
  <FilteredPayRunsPage
    category="projects"
    subType="manpower"
    payFrequency="monthly"
    title="Projects - Manpower Monthly Pay Runs"
    description="Manage monthly manpower payroll runs for projects"
  />
);

export const ProjectsIppmsPayRunsPage = () => (
  <FilteredPayRunsPage
    category="projects"
    subType="ippms"
    title="Projects - IPPMS Pay Runs"
    description="Manage IPPMS (piece rate) payroll runs for projects"
  />
);

export const ProjectsExpatriatePayRunsPage = () => (
  <FilteredPayRunsPage
    category="projects"
    subType="expatriate"
    title="Projects - Expatriate Pay Runs"
    description="Manage expatriate payroll runs for projects"
  />
);

