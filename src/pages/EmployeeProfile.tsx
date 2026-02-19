// @ts-nocheck
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, User, Mail, Phone, Briefcase, MapPin, DollarSign } from "lucide-react";
import { EmployeeContractsPanel } from "@/components/contracts/EmployeeContractsPanel";
import LoadingSkeleton from "@/components/LoadingSkeleton";

export default function EmployeeProfile() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) return;
    (async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*, pay_groups(name)")
        .eq("id", employeeId)
        .single();
      if (error) console.error(error);
      setEmployee(data);
      setLoading(false);
    })();
  }, [employeeId]);

  if (loading) return <LoadingSkeleton />;
  if (!employee) return <div className="p-6 text-center text-muted-foreground">Employee not found.</div>;

  const fullName = [employee.first_name, employee.middle_name, employee.last_name].filter(Boolean).join(" ");

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
        <Badge variant={employee.status === "active" ? "default" : "secondary"} className="ml-auto">
          {employee.status}
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
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
                <InfoRow icon={DollarSign} label="Pay Rate" value={`${employee.currency || ""} ${employee.pay_rate}`} />
                <InfoRow icon={Briefcase} label="Pay Type" value={employee.pay_type} />
                {employee.date_joined && <InfoRow icon={Briefcase} label="Date Joined" value={employee.date_joined} />}
              </CardContent>
            </Card>
          </div>
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
