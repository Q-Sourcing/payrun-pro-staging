export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            companies: {
                Row: {
                    id: string
                    name: string
                    organization_id: string
                    country_id: string | null
                    currency: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    organization_id: string
                    country_id?: string | null
                    currency?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    organization_id?: string
                    country_id?: string | null
                    currency?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            user_company_memberships: {
                Row: {
                    id: string
                    user_id: string
                    company_id: string
                    role: string | null
                    created_at: string | null
                    assigned_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    company_id: string
                    role?: string | null
                    created_at?: string | null
                    assigned_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    company_id?: string
                    role?: string | null
                    created_at?: string | null
                    assigned_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "user_company_memberships_company_id_fkey"
                        columns: ["company_id"]
                        referencedRelation: "companies"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "user_company_memberships_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            org_roles: {
                Row: {
                    id: string
                    org_id: string
                    key: string
                    name: string
                    description: string | null
                    system_defined: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    org_id: string
                    key: string
                    name: string
                    description?: string | null
                    system_defined?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    org_id?: string
                    key?: string
                    name?: string
                    description?: string | null
                    system_defined?: boolean
                    created_at?: string
                }
                Relationships: []
            }
            org_users: {
                Row: {
                    id: string
                    org_id: string
                    user_id: string
                    status: string
                    created_at: string
                    created_by: string | null
                }
                Insert: {
                    id?: string
                    org_id: string
                    user_id: string
                    status?: string
                    created_at?: string
                    created_by?: string | null
                }
                Update: {
                    id?: string
                    org_id?: string
                    user_id?: string
                    status?: string
                    created_at?: string
                    created_by?: string | null
                }
                Relationships: []
            }
            org_user_roles: {
                Row: {
                    id: string
                    org_user_id: string
                    role_id: string
                    created_at: string
                    created_by: string | null
                }
                Insert: {
                    id?: string
                    org_user_id: string
                    role_id: string
                    created_at?: string
                    created_by?: string | null
                }
                Update: {
                    id?: string
                    org_user_id?: string
                    role_id?: string
                    created_at?: string
                    created_by?: string | null
                }
                Relationships: []
            },
            company_settings: {
                Row: {
                    id: string
                    company_name: string | null
                    address: string | null
                    phone: string | null
                    email: string | null
                    website: string | null
                    tax_id: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    company_name?: string | null
                    address?: string | null
                    phone?: string | null
                    email?: string | null
                    website?: string | null
                    tax_id?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    company_name?: string | null
                    address?: string | null
                    phone?: string | null
                    email?: string | null
                    website?: string | null
                    tax_id?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            },
            company_unit_categories: {
                Row: {
                    id: string
                    company_unit_id: string
                    category_id: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    company_unit_id: string
                    category_id: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    company_unit_id?: string
                    category_id?: string
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "company_unit_categories_category_id_fkey"
                        columns: ["category_id"]
                        referencedRelation: "employee_categories"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "company_unit_categories_company_unit_id_fkey"
                        columns: ["company_unit_id"]
                        referencedRelation: "company_units"
                        referencedColumns: ["id"]
                    }
                ]
            },
            employee_categories: {
                Row: {
                    id: string
                    organization_id: string
                    key: string
                    label: string
                    description: string | null
                    active: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    organization_id: string
                    key: string
                    label: string
                    description?: string | null
                    active?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    key?: string
                    label?: string
                    description?: string | null
                    active?: boolean
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "employee_categories_organization_id_fkey"
                        columns: ["organization_id"]
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    }
                ]
            },
            activity_logs: {
                Row: {
                    id: string
                    organization_id: string | null
                    user_id: string | null
                    action: string
                    resource_type: string
                    resource_id: string | null
                    details: Json | null
                    ip_address: string | null
                    user_agent: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    organization_id?: string | null
                    user_id?: string | null
                    action: string
                    resource_type: string
                    resource_id?: string | null
                    details?: Json | null
                    ip_address?: string | null
                    user_agent?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string | null
                    user_id?: string | null
                    action?: string
                    resource_type?: string
                    resource_id?: string | null
                    details?: Json | null
                    ip_address?: string | null
                    user_agent?: string | null
                    created_at?: string
                }
                Relationships: []
            },
            auth_events: {
                Row: {
                    id: string
                    org_id: string | null
                    user_id: string | null
                    event_type: string
                    timestamp_utc: string
                    ip_address: string | null
                    geo_location: Json | null
                    user_agent: string | null
                    success: boolean
                    reason: string | null
                    metadata: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    org_id?: string | null
                    user_id?: string | null
                    event_type: string
                    timestamp_utc?: string
                    ip_address?: string | null
                    geo_location?: Json | null
                    user_agent?: string | null
                    success?: boolean
                    reason?: string | null
                    metadata?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    org_id?: string | null
                    user_id?: string | null
                    event_type?: string
                    timestamp_utc?: string
                    ip_address?: string | null
                    geo_location?: Json | null
                    user_agent?: string | null
                    success?: boolean
                    reason?: string | null
                    metadata?: Json | null
                    created_at?: string
                }
                Relationships: []
            },
            user_profiles: {
                Row: {
                    id: string
                    email: string | null
                    organization_id: string | null
                    role: string
                    first_name: string | null
                    last_name: string | null
                    failed_login_attempts: number
                    locked_at: string | null
                    locked_by: string | null
                    unlocked_at: string | null
                    unlocked_by: string | null
                    lockout_reason: string | null
                    activated_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email?: string | null
                    organization_id?: string | null
                    role?: string
                    first_name?: string | null
                    last_name?: string | null
                    failed_login_attempts?: number
                    locked_at?: string | null
                    locked_by?: string | null
                    unlocked_at?: string | null
                    unlocked_by?: string | null
                    lockout_reason?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string | null
                    organization_id?: string | null
                    role?: string
                    first_name?: string | null
                    last_name?: string | null
                    failed_login_attempts?: number
                    locked_at?: string | null
                    locked_by?: string | null
                    unlocked_at?: string | null
                    unlocked_by?: string | null
                    lockout_reason?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            },
            user_roles: {
                Row: {
                    id: string
                    user_id: string
                    role: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    role: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    role?: string
                    created_at?: string
                }
                Relationships: []
            },
            organization_security_settings: {
                Row: {
                    id: string
                    org_id: string
                    lockout_threshold: number
                    email_alerts_enabled: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    org_id: string
                    lockout_threshold?: number
                    email_alerts_enabled?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    org_id?: string
                    lockout_threshold?: number
                    email_alerts_enabled?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            },
            organizations: {
                Row: {
                    id: string
                    name: string
                    description: string | null
                    active: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    description?: string | null
                    active?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    description?: string | null
                    active?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            },
            user_invites: {
                Row: {
                    id: string
                    email: string
                    inviter_id: string | null
                    tenant_id: string | null
                    role_data: Json
                    status: string
                    token_hash: string | null
                    expires_at: string
                    accepted_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    email: string
                    inviter_id?: string | null
                    tenant_id?: string | null
                    role_data?: Json
                    status?: string
                    token_hash?: string | null
                    expires_at: string
                    accepted_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    inviter_id?: string | null
                    tenant_id?: string | null
                    role_data?: Json
                    status?: string
                    token_hash?: string | null
                    expires_at?: string
                    accepted_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            },
            pay_groups: {
                Row: {
                    id: string
                    name: string
                    organization_id: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    organization_id: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    organization_id?: string
                    created_at?: string
                }
                Relationships: []
            },
            company_units: {
                Row: {
                    id: string
                    company_id: string
                    name: string
                    kind: string | null
                    description: string | null
                    active: boolean
                    category_id: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    company_id: string
                    name: string
                    kind?: string | null
                    description?: string | null
                    active?: boolean
                    category_id?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    company_id?: string
                    name?: string
                    kind?: string | null
                    description?: string | null
                    active?: boolean
                    category_id?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "company_units_company_id_fkey"
                        columns: ["company_id"]
                        referencedRelation: "companies"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "company_units_category_id_fkey"
                        columns: ["category_id"]
                        referencedRelation: "employee_categories"
                        referencedColumns: ["id"]
                    }
                ]
            },
            employees: {
                Row: {
                    id: string
                    organization_id: string
                    first_name: string
                    last_name: string
                    email: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    organization_id: string
                    first_name: string
                    last_name: string
                    email?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    first_name?: string
                    last_name?: string
                    email?: string | null
                    created_at?: string
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            seed_default_categories: {
                Args: {
                    org_id: string
                }
                Returns: undefined
            }
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
