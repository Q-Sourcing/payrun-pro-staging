import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  EmployeeHrRecordsService,
  type EmployeeAddressRecord,
  type EmployeeDependentRecord,
  type EmployeeEducationRecord,
  type EmployeeWorkExperienceRecord,
} from "@/lib/services/employee-hr-records.service";

interface EmployeeHrRecordsTabProps {
  employeeId: string;
}

export function EmployeeHrRecordsTab({ employeeId }: EmployeeHrRecordsTabProps) {
  const [addresses, setAddresses] = useState<EmployeeAddressRecord[]>([]);
  const [dependents, setDependents] = useState<EmployeeDependentRecord[]>([]);
  const [education, setEducation] = useState<EmployeeEducationRecord[]>([]);
  const [experience, setExperience] = useState<EmployeeWorkExperienceRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [addressRows, dependentRows, educationRows, experienceRows] = await Promise.all([
          EmployeeHrRecordsService.listAddresses(employeeId),
          EmployeeHrRecordsService.listDependents(employeeId),
          EmployeeHrRecordsService.listEducation(employeeId),
          EmployeeHrRecordsService.listWorkExperience(employeeId),
        ]);
        setAddresses(addressRows);
        setDependents(dependentRows);
        setEducation(educationRows);
        setExperience(experienceRows);
      } catch (error) {
        console.error("Error loading employee HR records:", error);
      }
    };

    void load();
  }, [employeeId]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SummaryCard
        title="Addresses"
        count={addresses.length}
        emptyMessage="No addresses captured yet. Phase 2 schema is ready for present and permanent addresses."
        items={addresses.map((item) => `${item.address_type}: ${item.line_1}`)}
      />
      <SummaryCard
        title="Dependents"
        count={dependents.length}
        emptyMessage="No dependents captured yet. Zoho dependent details can be stored here when enabled."
        items={dependents.map((item) => `${item.full_name} (${item.relationship})`)}
      />
      <SummaryCard
        title="Education"
        count={education.length}
        emptyMessage="No education history captured yet."
        items={education.map((item) => `${item.institution_name}${item.degree_diploma ? ` · ${item.degree_diploma}` : ""}`)}
      />
      <SummaryCard
        title="Work Experience"
        count={experience.length}
        emptyMessage="No prior work experience captured yet."
        items={experience.map((item) => `${item.employer_name}${item.job_title ? ` · ${item.job_title}` : ""}`)}
      />
    </div>
  );
}

function SummaryCard({
  title,
  count,
  items,
  emptyMessage,
}: {
  title: string;
  count: number;
  items: string[];
  emptyMessage: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <Badge variant="outline">{count}</Badge>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {items.length === 0 ? (
          <p className="text-muted-foreground">{emptyMessage}</p>
        ) : (
          items.slice(0, 5).map((item) => (
            <div key={item} className="rounded-md border px-3 py-2">
              {item}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
