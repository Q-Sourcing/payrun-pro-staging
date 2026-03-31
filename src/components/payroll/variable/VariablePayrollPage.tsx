// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Package, ClipboardList, TrendingUp, BookOpen } from "lucide-react";
import { ItemsCatalogManager } from "./ItemsCatalogManager";
import { VariablePayrollWorkboard } from "./VariablePayrollWorkboard";
import { PayrollSummaryView } from "./PayrollSummaryView";
import { useAuth } from '@/lib/auth/AuthProvider';

interface VariablePayrollPageProps {
  projectId?: string;
  projectName?: string;
}

export function VariablePayrollPage({ projectId, projectName }: VariablePayrollPageProps) {
  const { userContext } = useAuth();
  const organizationId = userContext?.organizationId || "";

  if (!organizationId) {
    return <div className="text-sm text-muted-foreground p-4">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Variable Pay Engine
            {projectName && <Badge variant="outline">{projectName}</Badge>}
          </h2>
          <p className="text-xs text-muted-foreground">
            Track attendance, piece-rate output and allowances for variable-contract workers
          </p>
        </div>
      </div>

      <Tabs defaultValue="workboard">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="workboard" className="flex items-center gap-1.5 text-xs">
            <ClipboardList className="h-3.5 w-3.5" /> Workboard
          </TabsTrigger>
          <TabsTrigger value="catalog" className="flex items-center gap-1.5 text-xs">
            <Package className="h-3.5 w-3.5" /> Items Catalog
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-1.5 text-xs">
            <TrendingUp className="h-3.5 w-3.5" /> Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workboard" className="mt-4">
          <VariablePayrollWorkboard
            projectId={projectId}
            projectName={projectName}
            organizationId={organizationId}
          />
        </TabsContent>

        <TabsContent value="catalog" className="mt-4">
          <ItemsCatalogManager
            organizationId={organizationId}
            projectId={projectId}
            projectName={projectName}
          />
        </TabsContent>

        <TabsContent value="summary" className="mt-4">
          <PayrollSummaryView organizationId={organizationId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
