"use client";
import { useState, useRef, useCallback } from "react";
import { Input } from "../ui/input";
import Image from "next/image";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { getSignedURL } from "@/actions/S3/get-signed-url";

const UploadButton = () => {
  const [file, setFile] = useState<File>();
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [fileUrl, setFileUrl] = useState<string>();
  const [crop, setCrop] = useState<Crop>({ aspect: 1 });
  const imageRef = useRef<HTMLImageElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFile(f);

    if (fileUrl) URL.revokeObjectURL(fileUrl);

    if (f) {
      const newUrl = URL.createObjectURL(f);
      setFileUrl(newUrl);
    } else {
      setFileUrl(undefined);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!imageRef.current || !crop.width || !crop.height) return;

    setStatusMessage("creando...");
    setLoading(true);

    const canvas = document.createElement("canvas");
    const scaleX = imageRef.current.naturalWidth / imageRef.current.width;
    const scaleY = imageRef.current.naturalHeight / imageRef.current.height;
    canvas.width = crop.width;
    canvas.height = crop.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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

    const croppedBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg"));

    if (croppedBlob) {
      setStatusMessage("subiendo...");
      const signedUrlRequest = await getSignedURL();

      if (signedUrlRequest.failure !== undefined) {
        setStatusMessage("failed");
        setLoading(false);
        return;
      }

      await fetch(signedUrlRequest.success.url, {
        method: "PUT",
        body: croppedBlob,
        headers: { "Content-type": "image/jpeg" },
      });
    }

    setTimeout(() => {
      setStatusMessage("Subido");
      setLoading(false);
    }, 1000);
  };

  const handleRevoke = () => {
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
      setFileUrl(undefined);
      setFile(undefined);
    }
  };

  return (
    <>
      {statusMessage && <p className="bg-yellow-400 text-yellow-700 p-4">{statusMessage}</p>}

      <Input type="file" name="media" accept="image/jpeg, image/png, image/webp, image/gif" onChange={handleChange} />

      {fileUrl && file && (
        <div className="flex flex-col gap-4 items-center">
          <ReactCrop crop={crop} onChange={(c) => setCrop(c)}>
            <img ref={imageRef} src={fileUrl} alt={file.name} className="max-h-72" />
          </ReactCrop>

          <button type="button" onClick={handleRevoke} className="bg-red-500 text-white px-4 py-2 rounded-lg">
            Revoke File
          </button>
        </div>
      )}

      <button
        type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        disabled={loading}
      >
        {loading ? "Subiendo..." : "Subir"}
      </button>
    </>
  );
};

export default UploadButton;
