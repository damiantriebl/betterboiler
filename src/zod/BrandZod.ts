import { z } from "zod";

// Schema to Associate a Brand with an Organization
export const associateBrandSchema = z.object({
    name: z.string().min(1, "Brand name is required."),
    // Color is optional for the association itself initially
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color format (#RRGGBB)").optional().nullable(),
    // organizationId will be retrieved from session server-side
});
export type AssociateBrandFormData = z.infer<typeof associateBrandSchema>;


// Schema to Update an OrganizationBrand association (color/order)
// Renamed from updateAssociationSchema for clarity
export const updateBrandAssociationSchema = z.object({
    organizationBrandId: z.coerce.number().int(), // ID from the OrganizationBrand table
    brandId: z.coerce.number().int().optional(), // Optional, for extra validation if needed
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid format (#RRGGBB)").optional().nullable(),
    order: z.coerce.number().int().min(0).optional(),
    // organizationId retrieved from session
}).refine(data => data.color !== undefined || data.order !== undefined, {
    message: "At least color or order must be provided for update."
});
export type UpdateBrandAssociationFormData = z.infer<typeof updateBrandAssociationSchema>;


// Schema to Dissociate a Brand from an Organization
export const dissociateBrandSchema = z.object({
    organizationBrandId: z.coerce.number().int(), // ID from the OrganizationBrand table
    brandId: z.coerce.number().int().optional(), // Optional, for extra validation
    // organizationId retrieved from session
});
export type DissociateBrandFormData = z.infer<typeof dissociateBrandSchema>;


// Schema to Update the Order of Brands within an Organization
export const updateOrgBrandOrderSchema = z.array(z.object({
    id: z.number().int(), // ID of OrganizationBrand
    order: z.number().int().min(0),
}));
// No separate type needed usually, the array type is inferred

// NOTE: Schema for renaming/duplicating (renameBrandNMschema) is kept in the action file for now.
