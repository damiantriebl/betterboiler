'use client'

import { toast } from "@/hooks/use-toast";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/auth-client";
import { CldImage, CldUploadButton, CldUploadWidget } from 'next-cloudinary';

export default function Home() {
  const searchParams = useSearchParams()
  const { data: session } = authClient.useSession();
  const [resource, setResource] = useState();

  useEffect(() => {
    if (searchParams.get("error") === "not-admin-privilegies") {
      toast({
        title: "Error",
        description: "No estás logueado como administrador para acceder.",
        variant: "destructive",
      })
    }
  }, [searchParams])

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
     <div className="p-4">
        <CldUploadWidget
          uploadPreset="your-upload-preset"
          onSuccess={(result) => {
            console.log("Upload result:", result);
            setResource(result?.info?.secure_url);
          }}
          onError={(error) => {
            console.error("Upload error:", error);
          }}
          onClose={() => {
            console.log("Upload widget closed");
          }}
        >
          {({ open }) => (
            <button onClick={() => open()} className="px-4 py-2 bg-blue-500 text-white rounded">
              Upload an Image
            </button>
          )}
        </CldUploadWidget>
      </div>

      {resource && (
        <div>
          <h2>Uploaded Image:</h2>
          <CldImage alt="Uploaded" src={resource} width="500" height="500" />
        </div>
      )}
      <h1 className="text-4xl font-bold text-center">UKN</h1>
      <pre>{JSON.stringify(session, null, 2)}</pre>
      <CldImage
        alt="imagenes"
        src="cld-sample-5"
        width="500"
        height="500"
        crop={{
          type: 'auto',
          source: true
        }}
      />


      <h2>{searchParams.get("error")}</h2>
    </div>
  );
}
