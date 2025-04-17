import { z } from "zod";

// Schema for creating a new branch
export const createBranchSchema = z.object({
    name: z.string().min(1, "Branch name is required.").max(100, "Name cannot exceed 100 characters."),
    // organizationId is added server-side
});
export type CreateBranchFormData = z.infer<typeof createBranchSchema>;

// Schema for updating an existing branch name
export const updateBranchSchema = z.object({
    id: z.coerce.number().int(),
    name: z.string().min(1, "Branch name is required.").max(100, "Name cannot exceed 100 characters."),
     // organizationId is verified server-side
});
export type UpdateBranchFormData = z.infer<typeof updateBranchSchema>;

// Schema for deleting a branch
export const deleteBranchSchema = z.object({
    id: z.coerce.number().int(),
     // organizationId is verified server-side
});
export type DeleteBranchFormData = z.infer<typeof deleteBranchSchema>;

// Schema for updating the order of branches
export const updateBranchOrderSchema = z.array(z.object({
    id: z.number().int(),
    order: z.number().int().min(0),
}));
export type UpdateBranchOrderPayload = z.infer<typeof updateBranchOrderSchema>;
