
import { RBACService, Permission, Scope } from './src/lib/services/auth/rbac';

// Mock the environment or just run node
console.log("Testing RBAC Logic...");

const superAdminRole = 'super_admin';
const orgAdminRole = 'org_admin';

// Check basic permission
const hasPeopleView = RBACService.roleHasPermission(superAdminRole, 'people.view');
console.log(`SuperAdmin has people.view: ${hasPeopleView}`);

// Check scoped permission
const hasHeadOffice = RBACService.roleHasScopedPermission(superAdminRole, 'paygroups.view', 'head_office');
console.log(`SuperAdmin has head_office view: ${hasHeadOffice}`);

const hasProject = RBACService.roleHasScopedPermission(superAdminRole, 'paygroups.view', 'project');
console.log(`SuperAdmin has project view: ${hasProject}`);

// Check Org Admin
const orgHasPeople = RBACService.roleHasPermission(orgAdminRole, 'people.view');
console.log(`OrgAdmin has people.view: ${orgHasPeople}`);

// Dump all permissions for super_admin
// console.log(JSON.stringify(RBACService.getPermissionsForRole('super_admin'), null, 2));
