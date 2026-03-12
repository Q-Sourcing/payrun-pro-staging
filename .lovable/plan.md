
# Add Contract Template Manager to Settings

## What We're Building
A new "Contract Templates" section in the Settings panel where admins can create, edit, and manage contract templates. These templates are then available when generating contracts for employees.

## Changes

### 1. New Component: ContractTemplateManager
- Location: `src/components/settings/ContractTemplateManager.tsx`
- Features:
  - List all active templates for the current organization (table with name, country, employment type, version)
  - "New Template" button opening a dialog/form
  - Edit existing templates
  - Delete (soft-delete by setting `is_active = false`)
- Template form fields:
  - Name (required)
  - Description
  - Country code (optional dropdown)
  - Employment type (optional dropdown: permanent, contract, intern, expatriate)
  - Body HTML (rich text area with placeholder variable hints like `{{employee_name}}`, `{{start_date}}`, `{{job_title}}`, `{{salary}}`)
  - Placeholders editor (add/remove placeholder keys with labels and default values)
- Preview pane showing rendered HTML

### 2. Register in SettingsContent
- Add a new menu item `"contracts"` with icon `FileText` (or `ScrollText`) in the `allMenuItems` array
- Add the corresponding `case "contracts"` in `renderStandardContent()` rendering `<ContractTemplateManager />`
- Role guard: `ORG_ADMIN` / `organization_configuration`

### 3. Service Layer
- Reuse existing `ContractsService.getTemplates()`, `createTemplate()`, `updateTemplate()` from `src/lib/data/contracts.service.ts` (already built in Phase 2)

## Technical Details

### ContractTemplateManager component structure
```text
ContractTemplateManager
  +-- Templates Table (list view)
  +-- CreateEditTemplateDialog
       +-- Name, Description, Country, Employment Type fields
       +-- Body HTML textarea with placeholder hints
       +-- Placeholders JSONB editor (dynamic key/label/default rows)
       +-- Preview tab
```

### Placeholder system
Templates use `{{key}}` syntax. The manager will show a sidebar with available variables:
- `{{employee_name}}`, `{{employee_number}}`, `{{job_title}}`
- `{{start_date}}`, `{{end_date}}`, `{{salary}}`
- `{{company_name}}`, `{{department}}`
- Plus any custom placeholders defined on the template

### Files to create
- `src/components/contracts/ContractTemplateManager.tsx` -- main list + CRUD component
- `src/components/contracts/ContractTemplateForm.tsx` -- create/edit form dialog

### Files to modify
- `src/components/settings/SettingsContent.tsx` -- add menu item + render case
