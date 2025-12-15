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
            }
            activity_logs: {
                Row: {
                    id: string
                    user_id: string
                    action: string
                    resource: string
                    details: Json
                    ip_address: string
                    user_agent: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    action: string
                    resource: string
                    details?: Json
                    ip_address?: string
                    user_agent?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    action?: string
                    resource?: string
                    details?: Json
                    ip_address?: string
                    user_agent?: string
                    created_at?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}