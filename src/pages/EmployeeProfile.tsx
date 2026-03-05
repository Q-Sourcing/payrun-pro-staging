// @ts-nocheck
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, User, Mail, Phone, Briefcase, MapPin, DollarSign, Clock, ToggleLeft } from "lucide-react";
import { EmployeeContractsPanel } from "@/components/contracts/EmployeeContractsPanel";
import { ProbationSection } from "@/components/employees/ProbationSection";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { useToast } from "@/hooks/use-toast";

export default function EmployeeProfile() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingContractType, setSavingContractType] = useState(false);
  const { toast } = useToast();

  const fetchEmployee = async () => {
    if (!employeeId) return;
    const { data, error } = await supabase
      .from("employees")
      .select("*, pay_groups(name)")
      .eq("id", employeeId)
      .single();
    if (error) console.error(error);

    // Enrich with project data for data reusability in contracts
    let enriched = data;
    if (data?.project_id) {
      const { data: projectData } = await supabase
        .from("projects")
        .select("id, name, code, client_name, location, responsible_manager_id")
        .eq("id", data.project_id)
        .single();
      if (projectData) {
        enriched = {
          ...data,
          project_name: projectData.name,
          project_code: projectData.code,
          project_client: projectData.client_name,
          project_location: projectData.location,
          // Data reusability: surface client_name and location for contract template rendering
          client_name: data.client_name || projectData.client_name,
          location: data.location || projectData.location,
        };
      }
    }

    setEmployee(enriched);
    setLoading(false);
  };

  const updateContractType = async (val: string) => {
    setSavingContractType(true);
    const { error } = await supabase.from("employees").update({ contract_type: val }).eq("id", employeeId!);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setEmployee((e: any) => ({ ...e, contract_type: val }));
      toast({ title: "Contract type updated", description: `Switched to ${val === "monthly" ? "Fixed Monthly Salary" : "Variable Pay-on-Performance"}.` });
    }
    setSavingContractType(false);
  };

  useEffect(() => {
    fetchEmployee();
  }, [employeeId]);

  if (loading) return <LoadingSkeleton />;
  if (!employee) return <div className="p-6 text-center text-muted-foreground">Employee not found.</div>;

  const fullName = [employee.first_name, employee.middle_name, employee.last_name].filter(Boolean).join(" ");
  const contractType = employee.contract_type || "monthly";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{fullName}</h1>
          <p className="text-sm text-muted-foreground">{employee.employee_number} · {employee.email}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Badge variant={employee.status === "active" ? "default" : "secondary"}>{employee.status}</Badge>
          <Badge variant={contractType === "variable" ? "secondary" : "outline"} className="gap-1">
            <ToggleLeft className="h-3 w-3" />
            {contractType === "variable" ? "Variable Pay" : "Monthly Salary"}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="probation">Probation</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Personal Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow icon={User} label="Full Name" value={fullName} />
                <InfoRow icon={Mail} label="Email" value={employee.email} />
                <InfoRow icon={Phone} label="Phone" value={employee.phone || "—"} />
                <InfoRow icon={MapPin} label="Country" value={employee.country} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Employment Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow icon={Briefcase} label="Type" value={employee.employee_type} />
                <InfoRow icon={Briefcase} label="Pay Group" value={employee.pay_groups?.name || "Unassigned"} />
                <InfoRow icon={DollarSign} label="Pay Rate" value={`${employee.currency || ""} ${employee.pay_rate?.toLocaleString()}`} />
                <InfoRow icon={Briefcase} label="Pay Type" value={employee.pay_type} />
                {employee.date_joined && <InfoRow icon={Briefcase} label="Date Joined" value={employee.date_joined} />}
              </CardContent>
            </Card>

            {/* Contract Type Selector */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ToggleLeft className="h-4 w-4 text-primary" />
                  Payroll Contract Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-2">
                      Select whether this employee is paid a <strong>fixed monthly salary</strong> or a{" "}
                      <strong>variable pay-on-performance</strong> rate (daily attendance × rate + piece-rate items + allowances).
                    </p>
                    <Select value={contractType} onValueChange={updateContractType} disabled={savingContractType}>
                      <SelectTrigger className="w-72">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">
                          <div className="flex flex-col">
                            <span className="font-medium">Fixed Monthly Salary</span>
                            <span className="text-xs text-muted-foreground">Standard payroll with fixed gross pay per cycle</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="variable">
                          <div className="flex flex-col">
                            <span className="font-medium">Variable Pay-on-Performance</span>
                            <span className="text-xs text-muted-foreground">Daily attendance × rate + piece-rate items + allowances</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={`rounded-lg px-4 py-3 text-sm font-medium border ${contractType === "variable" ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800" : "bg-muted border-border text-muted-foreground"}`}>
                    {contractType === "variable" ? "⚡ Variable contract — payroll requires work log verification" : "📅 Monthly contract — standard payroll processing"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Probation Tab */}
        <TabsContent value="probation">
          <ProbationSection
            employeeId={employee.id}
            initialProbationEndDate={employee.probation_end_date}
            initialProbationStatus={employee.probation_status}
            initialProbationNotes={employee.probation_notes}
            onUpdated={fetchEmployee}
          />
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts">
          <EmployeeContractsPanel
            employeeId={employee.id}
            organizationId={employee.organization_id}
            employeeName={fullName}
            employeeData={employee}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground w-24">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
