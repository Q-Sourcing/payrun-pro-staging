import { supabase } from '@/integrations/supabase/client';
import type {
    HeadOfficePayGroupRefType,
    HeadOfficeStatus,
    HeadOfficeRegularPayGroup,
    HeadOfficeInternPayGroup,
    HeadOfficeExpatriatePayGroup,
    HeadOfficePayGroupMember,
    HeadOfficePayGroupCompanyUnit
} from '@/lib/types/paygroups';

export type HeadOfficePayGroup = HeadOfficeRegularPayGroup | HeadOfficeInternPayGroup | HeadOfficeExpatriatePayGroup;

export class HeadOfficePayGroupsService {
    private static getTableName(type: HeadOfficePayGroupRefType) {
        switch (type) {
            case 'regular': return 'head_office_pay_groups_regular';
            case 'intern': return 'head_office_pay_groups_interns';
            case 'expatriate': return 'head_office_pay_groups_expatriates';
            default: throw new Error(`Invalid Head Office paygroup type: ${type}`);
        }
    }

    /**
     * Get all paygroups of a specific type for an organization
     */
    static async getPayGroups(type: HeadOfficePayGroupRefType, organizationId: string): Promise<HeadOfficePayGroup[]> {
        const tableName = this.getTableName(type);
        const { data, error } = await supabase
            .from(tableName as any)
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(group => ({
            ...group,
            category: 'head_office'
        })) as HeadOfficePayGroup[];
    }

    /**
     * Create a new Head Office paygroup
     */
    static async createPayGroup(type: HeadOfficePayGroupRefType, data: Partial<HeadOfficePayGroup>): Promise<HeadOfficePayGroup> {
        const tableName = this.getTableName(type);
        const { data: created, error } = await supabase
            .from(tableName as any)
            .insert([data])
            .select()
            .single();

        if (error) throw error;

        // Sync with pay_group_master
        if (created?.id) {
            await supabase
                .from('pay_group_master' as any)
                .upsert({
                    type: type === 'regular' ? 'regular' : (type === 'intern' ? 'intern' : 'expatriate'),
                    source_table: tableName,
                    source_id: created.id,
                    code: `HO-${type.toUpperCase().substring(0, 3)}-${created.id.substring(0, 4)}`,
                    name: created.name,
                    country: 'UG', // Head Office is primarily UG for now
                    currency: type === 'expatriate' ? 'USD' : 'UGX',
                    active: true,
                    category: 'head_office',
                    employee_type: type === 'regular' ? 'regular' : (type === 'intern' ? 'interns' : 'expatriate'),
                    pay_frequency: (created as any).pay_frequency || null,
                    pay_type: (created as any).pay_type || null,
                    organization_id: (created as any).organization_id
                } as any, { onConflict: 'type,source_table,source_id' } as any);
        }

        return created as HeadOfficePayGroup;
    }

    /**
     * Unified membership management: Add members
     */
    static async addMembers(payGroupId: string, type: HeadOfficePayGroupRefType, employeeIds: string[]): Promise<void> {
        const members = employeeIds.map(empId => ({
            pay_group_id: payGroupId,
            pay_group_type: type,
            employee_id: empId,
            active: true
        }));

        const { error } = await supabase
            .from('head_office_pay_group_members' as any)
            .insert(members);

        if (error) throw error;
    }

    /**
     * Unified membership management: Get members
     */
    static async getMembers(payGroupId: string): Promise<HeadOfficePayGroupMember[]> {
        const { data, error } = await supabase
            .from('head_office_pay_group_members' as any)
            .select('*, employees(*)')
            .eq('pay_group_id', payGroupId)
            .eq('active', true);

        if (error) throw error;
        return data as any[];
    }

    /**
     * Tag paygroup with company units
     */
    static async tagCompanyUnits(payGroupId: string, type: HeadOfficePayGroupRefType, unitIds: string[]): Promise<void> {
        // Sync strategy: remove existing, add new
        await supabase
            .from('head_office_pay_group_company_units' as any)
            .update({ active: false })
            .eq('pay_group_id', payGroupId);

        const mappings = unitIds.map(unitId => ({
            pay_group_id: payGroupId,
            pay_group_type: type,
            company_unit_id: unitId,
            active: true
        }));

        const { error } = await supabase
            .from('head_office_pay_group_company_units' as any)
            .insert(mappings);

        if (error) throw error;
    }

    /**
     * Clone a paygroup for a new period
     */
    static async clonePayGroup(
        sourceId: string,
        type: HeadOfficePayGroupRefType,
        newPeriod: { start: string, end: string },
        options: { copyMembers: boolean, copyUnits: boolean }
    ): Promise<HeadOfficePayGroup> {
        const tableName = this.getTableName(type);

        // 1. Fetch source
        const { data: source, error: fetchError } = await supabase
            .from(tableName as any)
            .select('*')
            .eq('id', sourceId)
            .single();

        if (fetchError) throw fetchError;

        // 2. Insert new record
        const { id, created_at, updated_at, ...cloneData } = source as any;
        const { data: cloned, error: insertError } = await supabase
            .from(tableName as any)
            .insert([{
                ...cloneData,
                period_start: newPeriod.start,
                period_end: newPeriod.end,
                status: 'draft',
                source_pay_group_id: sourceId
            }])
            .select()
            .single();

        if (insertError) throw insertError;

        // Sync cloned group with pay_group_master
        if (cloned?.id) {
            await supabase
                .from('pay_group_master' as any)
                .upsert({
                    type: type === 'regular' ? 'regular' : (type === 'intern' ? 'intern' : 'expatriate'),
                    source_table: tableName,
                    source_id: cloned.id,
                    code: `HO-${type.toUpperCase().substring(0, 3)}-${cloned.id.substring(0, 4)}`,
                    name: cloned.name,
                    country: 'UG',
                    currency: type === 'expatriate' ? 'USD' : 'UGX',
                    active: true,
                    category: 'head_office',
                    employee_type: type === 'regular' ? 'regular' : (type === 'intern' ? 'interns' : 'expatriate')
                } as any, { onConflict: 'type,source_table,source_id' } as any);
        }

        // 3. Copy Members
        if (options.copyMembers) {
            const members = await this.getMembers(sourceId);
            if (members.length > 0) {
                await this.addMembers(cloned.id, type, members.map(m => m.employee_id));
            }
        }

        // 4. Copy Units
        if (options.copyUnits) {
            const { data: units } = await supabase
                .from('head_office_pay_group_company_units' as any)
                .select('company_unit_id')
                .eq('pay_group_id', sourceId)
                .eq('active', true);

            if (units && units.length > 0) {
                await this.tagCompanyUnits(cloned.id, type, units.map(u => u.company_unit_id));
            }
        }

        return cloned as HeadOfficePayGroup;
    }
}
