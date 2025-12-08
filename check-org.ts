import { supabase } from './src/integrations/supabase/client';

async function checkOrganization() {
    // Check GWAZU company
    const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id, name, organization_id')
        .eq('name', 'GWAZU')
        .single();

    if (companyError) {
        console.error('Error fetching company:', companyError);
        return;
    }

    console.log('GWAZU Company:', company);

    if (company.organization_id) {
        // Fetch organization details
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id, name')
            .eq('id', company.organization_id)
            .single();

        if (orgError) {
            console.error('Error fetching organization:', orgError);
        } else {
            console.log('Organization:', org);
        }
    } else {
        console.log('GWAZU company has no organization_id set');

        // Check if there are any organizations
        const { data: orgs, error: orgsError } = await supabase
            .from('organizations')
            .select('id, name')
            .limit(5);

        if (orgsError) {
            console.error('Error fetching organizations:', orgsError);
        } else {
            console.log('Available organizations:', orgs);
        }
    }
}

checkOrganization();
