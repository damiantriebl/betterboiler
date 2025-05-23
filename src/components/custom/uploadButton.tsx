"use client";
import { getSignedS3Url } from "@/actions/S3/get-signed-url";
import Image from "next/image";
import { useState } from "react";
import { Input } from "../ui/input";
import { Badge } from "@/components/ui/badge";

const UploadButton = () => {
  const [file, setFile] = useState<File>();
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [fileUrl, setFileUrl] = useState<string>();

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
    console.log("Datos del formulario:", { file, fileUrl });
    setStatusMessage("creando...");
    setLoading(true);
    if (file) {
      setStatusMessage("subiendo...");

      // Generar un nombre único para el archivo
      const fileName = `${Date.now()}-${file.name}`;
      const signedUrlRequest = await getSignedS3Url({
        name: fileName,
        operation: "put"
      });
      console.log("signed", signedUrlRequest);
      if ("failure" in signedUrlRequest) {
        setStatusMessage("failed");
        console.error("error");
        setLoading(false);
        return;
      }
      const url = signedUrlRequest.success.url;
      await fetch(url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-type": file?.type,
        },
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
      console.log("Archivo revocado:", fileUrl);
      setFileUrl(undefined);
      setFile(undefined);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {statusMessage && <p className="bg-yellow-400 text-yellow-700 p-4">{statusMessage}</p>}

      <Input
        type="file"
        name="media"
        accept="image/jpeg, image/png, image/webp, image/gif"
        onChange={handleChange}
      />

      {fileUrl && file && (
        <div className="flex flex-col gap-4 items-center">
          {file.type.startsWith("image/") && (
            <div className="rounded-lg overflow-hidden size-72 relative">
              <Image
                className="object-cover"
                src={fileUrl}
                alt={file.name}
                priority
                layout="fill"
              />
            </div>
          )}
          <button
            type="button"
            onClick={handleRevoke}
            className="bg-red-500 text-white px-4 py-2 rounded-lg"
          >
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
    </form>
  );
};

export default UploadButton;
