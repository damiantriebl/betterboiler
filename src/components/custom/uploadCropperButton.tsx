"use client";
import { useState, useRef } from "react";
import ReactCrop, { Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "../ui/button";

export interface UploadResult {
  originalFile: File;
  croppedBlob?: Blob;
}

interface UploadButtonProps {
  onChange: (result: UploadResult) => void;
  placeholder?: string;
  crop?: boolean;
  maxSize?: number; // en MB
  accept?: string;
}

const UploadButton: React.FC<UploadButtonProps> = ({
  onChange,
  placeholder,
  crop = true,
  maxSize,
  accept = "image/jpeg, image/png, image/webp, image/gif",
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | undefined>();
  const [fileUrl, setFileUrl] = useState("");
  const [cropConfig, setCropConfig] = useState<Crop>({unit: '%', x: 25, y: 25, width: 50, height: 50 });
  const imageRef = useRef<HTMLImageElement>(null);

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    // Validar tamaño
    if (maxSize && f.size / 1024 / 1024 > maxSize) {
      setStatusMessage(`El archivo supera el tamaño máximo de ${maxSize} MB.`);
      return;
    }

    setFile(f);
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    const url = URL.createObjectURL(f);
    setFileUrl(url);

    if (!crop) {
      onChange({ originalFile: f });
    }
  };

  const handleCrop = async () => {
    if (!imageRef.current || !cropConfig.width || !cropConfig.height || !file) return;
    setStatusMessage("Procesando...");
    setLoading(true);

    const canvas = document.createElement("canvas");
    const scaleX = imageRef.current.naturalWidth / imageRef.current.width;
    const scaleY = imageRef.current.naturalHeight / imageRef.current.height;
    canvas.width = cropConfig.width;
    canvas.height = cropConfig.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setLoading(false);
      return;
    }

    ctx.drawImage(
      imageRef.current,
      cropConfig.x * scaleX,
      cropConfig.y * scaleY,
      cropConfig.width * scaleX,
      cropConfig.height * scaleY,
      0,
      0,
      cropConfig.width,
      cropConfig.height
    );

    const croppedBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg")
    );

    if (croppedBlob) {
      onChange({ originalFile: file, croppedBlob });
      setStatusMessage("Procesado");
    } else {
      setStatusMessage("Error al procesar imagen");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {statusMessage && <p>{statusMessage}</p>}

        <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />

      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
        {placeholder}
      </Button>

      {fileUrl && file && crop && (
        <div className="flex flex-col gap-4 items-center">
          <ReactCrop
            
            crop={cropConfig}
            onChange={(newCrop) => setCropConfig(newCrop)}
            onComplete={(c) => {
              if (c.width && c.height) {
                handleCrop();
              }
            }}
          >
            <img ref={imageRef} src={fileUrl} alt="preview" className="max-h-72" />
          </ReactCrop>
        </div>
      )}

      {fileUrl && file && !crop && (
        <div className="flex flex-col items-center">
          <img src={fileUrl} alt="preview" className="max-h-72" />
        </div>
      )}
    </div>
  );
};

export default UploadButton;
