"use client";

import UploadButton from "@/components/custom/UploadCropperButton";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { MotorcycleBatchFormData } from "@/zod/NewBikeZod";
import React from "react";
import type { Control, UseFormSetValue } from "react-hook-form";

interface MultimediaSectionProps {
  control: Control<MotorcycleBatchFormData>;
  setValue: UseFormSetValue<MotorcycleBatchFormData>;
  isSubmitting?: boolean;
}

export function MultimediaSection({
  control,
  setValue,
  isSubmitting = false,
}: MultimediaSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      <FormField
        control={control}
        name="imageUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Imagen Principal</FormLabel>
            <FormControl>
              <UploadButton
                onChange={(result) => {
                  // Convert File to URL for preview or handle upload here
                  const file = result.croppedFile || result.originalFile;
                  const url = URL.createObjectURL(file);
                  setValue("imageUrl", url);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
