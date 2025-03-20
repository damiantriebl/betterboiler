"use client";
import { useState, useRef } from "react";
import { Input } from "../ui/input";
import ReactCrop, { Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

export interface UploadResult {
  originalFile: File;
  croppedBlob: Blob;
}

interface UploadButtonProps {
  onChange: (result: UploadResult) => void;
  placeholder?: string;
}

const UploadButton: React.FC<UploadButtonProps> = ({ onChange, placeholder }) => {
  const [file, setFile] = useState<File | undefined>();
  const [fileUrl, setFileUrl] = useState("");
  const [crop, setCrop] = useState<Crop>({ aspect: 1 });
  const imageRef = useRef<HTMLImageElement>(null);

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFile(f);
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFileUrl(f ? URL.createObjectURL(f) : "");
  };

  const handleCrop = async () => {
    if (!imageRef.current || !crop.width || !crop.height || !file) return;
    setStatusMessage("Procesando...");
    setLoading(true);

    const canvas = document.createElement("canvas");
    const scaleX = imageRef.current.naturalWidth / imageRef.current.width;
    const scaleY = imageRef.current.naturalHeight / imageRef.current.height;
    canvas.width = crop.width;
    canvas.height = crop.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setLoading(false);
      return;
    }

    ctx.drawImage(
      imageRef.current,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
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
      <Input
        type="file"
        onChange={handleChange}
        placeholder={placeholder}
        accept="image/jpeg, image/png, image/webp, image/gif"
      />
      {fileUrl && file && (
        <div className="flex flex-col gap-4 items-center">
          <ReactCrop
            crop={crop}
            onChange={(newCrop) => setCrop(newCrop)}
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
    </div>
  );
};

export default UploadButton;
