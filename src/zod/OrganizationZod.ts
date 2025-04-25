import { z } from "zod";

// Schema for the Create/Edit Organization form
export const organizationSchema = z.object({
  id: z.string().optional(), // Optional ID for editing
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  // logoFile is handled separately in the form, not part of this base schema usually
  // If the action expects the URL directly, add it here:
  logo: z.string().nullable().optional(),
  // For client-side validation including the file:
  logoFile: z.instanceof(File).optional(),
});

export type OrganizationFormData = z.infer<typeof organizationSchema>;

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  logo: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type OrganizationInput = z.infer<typeof OrganizationSchema>;
