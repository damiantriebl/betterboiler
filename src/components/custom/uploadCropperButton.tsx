// src/components/custom/UploadCropperButton.tsx
"use client";
import type React from "react";
import { useRef, useState } from "react";
import ReactCrop, { type Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export interface UploadResult {
  originalFile: File;
  croppedFile?: File;
}

export interface UploadButtonProps {
  placeholder?: string;
  onChange: (result: UploadResult) => void;
  accept?: string;
  crop?: boolean;
  aspect?: number;
  disabled?: boolean;
}

export default function UploadButton({
  placeholder = "Subir archivo",
  onChange,
  accept = "image/jpeg, image/png, image/webp, image/gif",
  crop = false,
  aspect,
  disabled = false,
}: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [cropConfig, setCropConfig] = useState<Crop>({
    unit: "%",
    width: 90,
    height: 90,
    x: 5,
    y: 5,
  });
  const [loading, setLoading] = useState(false);

  const resetUploadState = () => {
    setFileUrl(null);
    setFile(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    try {
      setLoading(true);
      setFile(selectedFile);

      if (crop && selectedFile.type.startsWith("image/")) {
        const url = URL.createObjectURL(selectedFile);
        setFileUrl(url);
      } else {
        onChange({ originalFile: selectedFile });
        resetUploadState();
      }
    } catch (error) {
      console.error("Error processing file:", error);
      resetUploadState();
    } finally {
      setLoading(false);
    }
  };

  const getCroppedImg = async (image: HTMLImageElement, crop: Crop): Promise<Blob> => {
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("No 2d context");
    }

    const pixelRatio = window.devicePixelRatio;
    canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
    canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = "high";

    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;

    ctx.drawImage(
      image,
      cropX,
      cropY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width * scaleX,
      crop.height * scaleY,
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas is empty"));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        1,
      );
    });
  };

  const handleCropComplete = async () => {
    if (!file || !imgRef.current) return;

    try {
      setLoading(true);
      const croppedBlob = await getCroppedImg(imgRef.current, cropConfig);
      const croppedFile = new File([croppedBlob], file.name, {
        type: "image/jpeg",
      });

      onChange({
        originalFile: file,
        croppedFile,
      });

      resetUploadState();
    } catch (error) {
      console.error("Error cropping image:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
        disabled={disabled}
        aria-label={placeholder}
      />
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={disabled || loading}
        className="w-full"
      >
        <Upload className="h-4 w-4 mr-2" />
        {loading ? "Procesando..." : placeholder}
      </Button>
      {fileUrl && file && crop && (
        <div className="mt-4">
          <ReactCrop crop={cropConfig} onChange={(c) => setCropConfig(c)} aspect={aspect}>
            <img ref={imgRef} src={fileUrl} alt="Preview" />
          </ReactCrop>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={resetUploadState} disabled={loading}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleCropComplete} disabled={loading}>
              Recortar y subir
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
