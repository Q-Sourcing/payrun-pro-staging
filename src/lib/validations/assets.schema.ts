import { z } from 'zod';

export const createAssetSchema = z.object({
  name: z.string().min(1, 'Asset name is required').max(200),
  asset_type_id: z.string().uuid().optional().nullable(),
  status: z.enum(['active', 'damaged', 'lost', 'decommissioned']).default('active'),
  useful_life_years: z.number().int().positive().optional().nullable(),
  purchase_price: z.number().nonnegative().optional().nullable(),
  purchase_date: z.string().optional().nullable(),
  serial_number: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
});

export const updateAssetSchema = createAssetSchema.partial().extend({
  id: z.string().uuid(),
});

export const reassignAssetSchema = z.object({
  asset_id: z.string().uuid(),
  new_employee_id: z.string().uuid({ message: 'Please select an employee' }),
  return_condition: z.string().max(500).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const logAssetEventSchema = z.object({
  asset_id: z.string().uuid(),
  event_type: z.enum(['note', 'damage', 'repair', 'reassignment', 'status_change', 'decommission', 'created']),
  description: z.string().min(1, 'Description is required').max(1000),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type ReassignAssetInput = z.infer<typeof reassignAssetSchema>;
export type LogAssetEventInput = z.infer<typeof logAssetEventSchema>;
