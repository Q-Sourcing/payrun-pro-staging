

# FLIP EHS Module — Combined Comprehensive Plan

## Strategic Vision

EHS is site-based and employee-based, integrated into FLIP's existing project/site structure. Every EHS record connects to: **Company → Project/Site → Employee → Supervisor**. This makes FLIP a workforce operations platform, not just payroll.

## Module Scope

### Phase 1 (MVP)
1. **EHS Dashboard** — org-wide and per-site KPIs
2. **Incident Management** — full lifecycle with investigation workflow
3. **Hazard Reporting** — proactive hazard identification (includes Safety Observations)
4. **Safety Inspections** — scheduled/ad-hoc with checklists
5. **Training & Certifications** — tracking with expiry alerts
6. **Corrective Actions** — linked to incidents, hazards, and inspections

### Phase 2
7. Risk Assessments (JHAs with probability × severity matrix)
8. PPE Management (issuance, condition, replacement tracking)
9. Permits to Work (hot work, confined space, excavation, height)
10. Environmental Management (spills, waste, emissions)
11. Emergency Management (drills, evacuation plans, assembly points)
12. Compliance & Regulations (OSHA, ISO 45001, local regs)
13. Payroll-EHS integration (safety bonuses, incident deductions)
14. Advanced analytics and AI-assisted classification

---

## Database Schema

### Phase 1 Tables

```text
ehs_incidents
├── id (uuid PK)
├── organization_id, project_id, company_id
├── incident_number (auto-generated)
├── title, description
├── incident_date, incident_time
├── site_location (text — location on site)
├── reported_by (FK employees)
├── employees_involved (uuid[] — employees involved)
├── supervisor_id (FK employees)
├── incident_type (enum: injury, fatality, property_damage,
│   environmental_spill, near_miss, unsafe_condition, unsafe_act)
├── severity (1-5: near_miss, first_aid, medical_treatment,
│   lost_time_injury, fatality)
├── classification (OSHA: recordable, first_aid, etc.)
├── immediate_action_taken (text)
├── photos (text[] — storage URLs)
├── status (reported, under_investigation, root_cause_identified,
│   corrective_action, closed)
├── investigator_id (FK employees)
├── root_cause (text)
├── root_cause_category (text)
├── lost_days (integer)
├── injury_type, body_part_affected
├── closed_at
├── created_at, updated_at

ehs_hazards
├── id (uuid PK)
├── organization_id, project_id, company_id
├── hazard_number (auto-generated)
├── site_location (text)
├── description
├── risk_level (enum: low, medium, high, critical)
├── photos (text[])
├── reported_by (FK employees)
├── observation_type (enum: hazard, safety_observation)
├── assigned_to (FK employees)
├── status (reported, assigned, mitigation_in_progress, resolved)
├── resolution_notes (text)
├── resolved_at
├── created_at, updated_at

ehs_inspections
├── id (uuid PK)
├── organization_id, project_id, company_id
├── inspection_number
├── type (enum: daily, weekly, monthly, compliance_audit)
├── template_id (FK ehs_inspection_templates)
├── scheduled_date, completed_date
├── inspector_id (FK employees)
├── status (scheduled, in_progress, completed)
├── overall_score (numeric)
├── notes
├── created_at, updated_at

ehs_inspection_templates
├── id, organization_id
├── name, category
├── checklist_items (jsonb[])
│   Each: { item: text, category: text }
├── created_at, updated_at

ehs_inspection_items
├── id, inspection_id (FK)
├── checklist_item (text)
├── category (text)
├── result (enum: pass, fail, needs_attention)
├── finding_text
├── photo_url
├── auto_hazard_id (FK ehs_hazards — auto-created on fail)

ehs_training_records
├── id (uuid PK)
├── organization_id, project_id (nullable)
├── employee_id (FK employees)
├── training_type (enum: first_aid, fire_safety,
│   working_at_height, equipment_operation,
│   hazmat_handling, other)
├── course_name, trainer, provider
├── completed_date, expiry_date
├── certificate_number
├── certificate_url (storage)
├── status (valid, expired, expiring_soon)
├── created_at, updated_at

ehs_corrective_actions
├── id (uuid PK)
├── organization_id, project_id
├── source_type (enum: incident, hazard, inspection)
├── source_id (uuid)
├── description
├── assigned_to (FK employees)
├── responsible_person (FK employees)
├── due_date, closed_at
├── priority (low, medium, high, critical)
├── status (open, in_progress, closed, overdue)
├── evidence_url
├── created_at, updated_at
```

All tables get RLS policies scoped by `organization_id` using the existing `current_org_id()` function.

---

## Dashboard Metrics

### Organization-wide Dashboard (`/ehs`)

| Card | Source |
|------|--------|
| Total Employees on Sites | employees + project assignments |
| Days Without Incident | `MAX(incident_date)` per site |
| Incidents This Month | Count from `ehs_incidents` |
| Open Hazards | `ehs_hazards WHERE status != 'resolved'` |
| Safety Inspections Due | `ehs_inspections WHERE scheduled_date <= now() AND status = 'scheduled'` |
| Expiring Certifications (30d) | `ehs_training_records WHERE expiry_date <= now() + 30d` |

### Charts (Recharts)
- Incident frequency trend (monthly bar chart)
- LTIFR line chart: `(LTIs × 1,000,000) / hours_worked`
- Incident Rate: `total_incidents / total_employees`
- Near misses vs incidents (stacked bar)
- Hazard resolution time
- Safety training completion rate
- Inspection compliance score

### Per-Site Dashboard
Same metrics filtered by `project_id`, shown as a tab in `ProjectDetailPage`.

---

## Workflows

### Incident Investigation
```text
Reported → Under Investigation → Root Cause Identified → Corrective Action → Closed
```
Each status change is timestamped. On "Corrective Action" step, an `ehs_corrective_actions` record is auto-created.

### Hazard Resolution
```text
Reported → Assigned → Mitigation in Progress → Resolved
```
If unresolved after 48h, auto-escalate notification to site manager.

### Inspection Failure
When an inspection item result = `fail`, automatically create an `ehs_hazards` record linked back to the inspection item.

---

## Severity & Risk Classification

### Incident Severity (5-point scale)
| Level | Description |
|-------|-------------|
| 1 | Near miss |
| 2 | First aid |
| 3 | Medical treatment |
| 4 | Lost time injury |
| 5 | Fatality |

### Hazard Risk Level
Low, Medium, High, Critical — displayed with color-coded badges.

---

## RBAC Permissions

New permissions seeded into the existing RBAC system:

| Permission Key | Description |
|---|---|
| `ehs.view_dashboard` | View EHS dashboards |
| `ehs.report_incident` | Report incidents (Worker+) |
| `ehs.manage_incidents` | Investigate and close incidents (Supervisor+) |
| `ehs.report_hazard` | Report hazards/observations (Worker+) |
| `ehs.manage_hazards` | Assign and resolve hazards (EHS Officer+) |
| `ehs.manage_inspections` | Create and complete inspections |
| `ehs.manage_training` | Manage training records |
| `ehs.manage_corrective_actions` | Manage corrective actions |
| `ehs.view_reports` | View analytics and regulatory reports |
| `ehs.approve_closure` | Approve incident/hazard closure (EHS Officer+) |

Role mappings: Admin gets all. HR gets view + training. Supervisors get report + investigate. Workers get report only.

---

## Frontend Architecture

### Navigation
Add "EHS" section to the sidebar with sub-items:
- Dashboard (`/ehs`)
- Incidents (`/ehs/incidents`)
- Hazards (`/ehs/hazards`)
- Inspections (`/ehs/inspections`)
- Training (`/ehs/training`)
- Reports (`/ehs/reports`)

### Per-Project EHS Tab
Add an "EHS" tab to `ProjectDetailPage` showing site-scoped data.

### Component Structure
```text
src/
  pages/ehs/
    Index.tsx, Incidents.tsx, Hazards.tsx,
    Inspections.tsx, Training.tsx, Reports.tsx
  components/ehs/
    EhsDashboard.tsx
    incidents/   — IncidentList, IncidentForm, IncidentDetail
    hazards/     — HazardList, HazardForm
    inspections/ — InspectionList, InspectionForm, InspectionChecklist
    training/    — TrainingList, TrainingForm
    corrective-actions/ — CAList, CAForm
    reports/     — EhsReports (OSHA 300 log export via jspdf)
  lib/
    services/ehs.service.ts
    types/ehs.ts
```

---

## Notifications & Alerts

Using the existing `notifications` table:
- Incident reported → notify site manager + EHS officer
- Inspection overdue → notify assigned inspector
- Training expiring (30 days) → notify employee + HR
- Hazard unresolved 48h → escalate to site manager
- Corrective action overdue → notify assigned person + manager

A daily edge function (`ehs-safety-alerts`) via `pg_cron` handles expiry checks.

---

## Regulatory Reports

- **OSHA 300 Log** — injury/illness log with case details
- **OSHA 300A Summary** — annual summary with TRIR calculation
- Export via jspdf/jspdf-autotable (already installed)

---

## Implementation Phases

**Phase 1 — Foundation**
1. Database migration: all Phase 1 tables + RLS + triggers
2. Seed EHS permissions into RBAC
3. TypeScript types + service layer
4. Sidebar navigation + routes
5. EHS Dashboard with KPI cards + charts

**Phase 1 — Core Modules**
6. Incident management (CRUD + investigation workflow + severity)
7. Hazard reporting (includes safety observations, auto-escalation)
8. Safety inspections (templates + checklists + auto-hazard on fail)
9. Training & certification tracker
10. Corrective action tracking (linked to all sources)
11. Per-project EHS tab on ProjectDetailPage
12. OSHA reports + PDF export

**Phase 2 — Advanced**
13. Risk assessments with probability × severity matrix
14. PPE management (issuance, condition, replacement)
15. Permits to work with approval workflow
16. Environmental incident tracking
17. Emergency management (drills, evacuation plans)
18. Compliance tracking (OSHA, ISO 45001)
19. Advanced analytics (Safety Compliance Score)
20. Payroll-EHS integration (safety bonuses/penalties)

