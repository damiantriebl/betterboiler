'use client'

import { toast } from "@/hooks/use-toast";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/auth-client";
import UploadButton from "@/components/custom/uploadButton";

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
      <h1 className="text-4xl font-bold text-center">UKN</h1>
      <pre>{JSON.stringify(session, null, 2)}</pre>         
      <h2>{searchParams.get("error")}</h2>
    </div>
  );
}
