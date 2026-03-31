// @ts-nocheck
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Download, FileText } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { getIncidents } from '@/lib/services/ehs.service';
import { SEVERITY_LABELS, INCIDENT_TYPE_LABELS } from '@/lib/types/ehs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export default function EhsReports() {
  const { userContext } = useAuth();
  const orgId = userContext?.organizationId;

  const { data: incidents = [] } = useQuery({
    queryKey: ['ehs-incidents', orgId],
    queryFn: () => getIncidents(orgId!),
    enabled: !!orgId,
  });

  const recordableIncidents = incidents.filter((i) => i.severity !== 'near_miss');
  const currentYear = new Date().getFullYear();
  const yearIncidents = recordableIncidents.filter((i) => new Date(i.incident_date).getFullYear() === currentYear);

  const totalRecordable = yearIncidents.length;
  const lostTimeInjuries = yearIncidents.filter((i) => i.severity === 'lost_time_injury' || i.severity === 'fatality').length;
  const fatalities = yearIncidents.filter((i) => i.severity === 'fatality').length;
  const totalLostDays = yearIncidents.reduce((sum, i) => sum + (i.lost_days || 0), 0);

  function generateOsha300() {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('OSHA 300 — Log of Work-Related Injuries and Illnesses', 14, 20);
    doc.setFontSize(10);
    doc.text(`Year: ${currentYear}`, 14, 28);
    doc.text(`Organization: ${userContext?.organizationId || ''}`, 14, 34);

    autoTable(doc, {
      startY: 40,
      head: [['Case #', 'Employee', 'Date', 'Location', 'Description', 'Type', 'Severity', 'Lost Days']],
      body: yearIncidents.map((i) => [
        i.incident_number,
        i.reported_by || '—',
        format(new Date(i.incident_date), 'MM/dd/yyyy'),
        i.site_location || '—',
        i.title,
        INCIDENT_TYPE_LABELS[i.incident_type] || i.incident_type,
        SEVERITY_LABELS[i.severity] || i.severity,
        String(i.lost_days || 0),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`OSHA_300_Log_${currentYear}.pdf`);
  }

  function generateOsha300A() {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('OSHA 300A — Summary of Work-Related Injuries', 14, 20);
    doc.setFontSize(12);
    doc.text(`Calendar Year: ${currentYear}`, 14, 32);

    const summaryData = [
      ['Total Recordable Cases', String(totalRecordable)],
      ['Lost Time Injuries', String(lostTimeInjuries)],
      ['Fatalities', String(fatalities)],
      ['Total Lost Workdays', String(totalLostDays)],
      ['TRIR (per 200,000 hrs)', 'N/A — configure hours worked'],
      ['LTIFR (per 1,000,000 hrs)', 'N/A — configure hours worked'],
    ];

    autoTable(doc, {
      startY: 40,
      head: [['Metric', 'Value']],
      body: summaryData,
      styles: { fontSize: 11 },
      headStyles: { fillColor: [41, 128, 185] },
      columnStyles: { 0: { fontStyle: 'bold' } },
    });

    // Breakdown by type
    const byType: Record<string, number> = {};
    yearIncidents.forEach((i) => {
      const label = INCIDENT_TYPE_LABELS[i.incident_type] || i.incident_type;
      byType[label] = (byType[label] || 0) + 1;
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable?.finalY + 15 || 120,
      head: [['Incident Type', 'Count']],
      body: Object.entries(byType).map(([k, v]) => [k, String(v)]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [46, 139, 87] },
    });

    doc.save(`OSHA_300A_Summary_${currentYear}.pdf`);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">EHS Reports</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Recordable ({currentYear})</p>
            <p className="text-3xl font-bold text-destructive mt-1">{totalRecordable}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Lost Time Injuries</p>
            <p className="text-3xl font-bold text-orange-600 mt-1">{lostTimeInjuries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Fatalities</p>
            <p className="text-3xl font-bold text-red-700 mt-1">{fatalities}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Lost Workdays</p>
            <p className="text-3xl font-bold mt-1">{totalLostDays}</p>
          </CardContent>
        </Card>
      </div>

      {/* Export Buttons */}
      <Card>
        <CardHeader><CardTitle className="text-base">Regulatory Reports</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button variant="outline" onClick={generateOsha300}>
            <FileText className="h-4 w-4 mr-2" />OSHA 300 Log (PDF)
          </Button>
          <Button variant="outline" onClick={generateOsha300A}>
            <Download className="h-4 w-4 mr-2" />OSHA 300A Summary (PDF)
          </Button>
        </CardContent>
      </Card>

      {/* Incident breakdown */}
      <Card>
        <CardHeader><CardTitle className="text-base">Incidents by Severity ({currentYear})</CardTitle></CardHeader>
        <CardContent>
          {yearIncidents.length === 0 ? (
            <p className="text-muted-foreground text-sm">No incidents recorded for {currentYear}</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {Object.entries(
                yearIncidents.reduce((acc, i) => {
                  const label = SEVERITY_LABELS[i.severity] || i.severity;
                  acc[label] = (acc[label] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([label, count]) => (
                <Badge key={label} variant="secondary" className="text-sm px-3 py-1">
                  {label}: {count}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
