
/**
 * Utility to resolve organization display name from an object that might contain org details.
 * Prioritizes `organization.name`, then `org_name`, then falls back to "Unknown Organization".
 * NEVER returns the UUID as the display name.
 */
export function resolveOrgDisplay(data: any): string {
    if (!data) return 'Unknown Organization';

    // 1. Nested organization object
    if (data.organization && typeof data.organization === 'object' && data.organization.name) {
        return data.organization.name;
    }

    // 2. Direct org_name property (common in joined queries)
    if (data.org_name) {
        return data.org_name;
    }

    // 3. Aliased or other common patterns
    if (data.organization_name) {
        return data.organization_name;
    }

    // 4. Fallback if only ID is available - DO NOT RETURN ID
    // In a real app, we might want to trigger a fetch here or warn, 
    // but for a sync utility, we must return a safe string.
    return 'Unknown Organization';
}

/**
 * Helper to formatting a select option for organizations
 */
export function formatOrgOption(org: { id: string, name: string }) {
    return {
        value: org.id,
        label: org.name
    };
}
