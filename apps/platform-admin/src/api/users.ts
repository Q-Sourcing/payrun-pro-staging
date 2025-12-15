import { callEdgeFunction } from "@/api/edge";

export type UserRole = 'employee' | 'hr_manager' | 'finance' | 'admin' | 'super_admin';

export type CreateUserPayload = {
    email: string;
    full_name: string;
    role: UserRole;
    country: string;
    password?: string; // Optional if auto-generated or handled otherwise
};

export type CreateUserResponse = {
    success: boolean;
    message: string;
    user_id?: string;
    error?: string;
};

export async function createUser(payload: CreateUserPayload): Promise<CreateUserResponse> {
    // Assuming 'create-user' edge function handles the creation.
    // If password is omitted, the edge function can invite the user by email.
    const body: Record<string, unknown> = { ...payload };
    if (!payload.password) delete body.password;

    const res = await callEdgeFunction<CreateUserResponse>("create-user", {
        method: "POST",
        body,
    });
    return res;
}

export async function searchUsers(query: string): Promise<any[]> {
    // Placeholder - typically this would query a global users view or standard profiles table
    // For now, we might leverage existing org user search or add a new backend capability
    // This function will need access to a global user search endpoint
    // Returning empty for now as verified backend endpoint for global search is TBD in plan
    console.warn("Global user search not fully implemented in backend yet.");
    return [];
}
