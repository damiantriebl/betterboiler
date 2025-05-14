"use client";

import { authClient } from "@/auth-client";
import UploadButton from "@/components/custom/UploadButton";
import { toast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = authClient.useSession();
  const [resource, setResource] = useState();

  useEffect(() => {
    if (searchParams.get("error") === "not-admin-privilegies") {
      toast({
        title: "Error",
        description: "No estás logueado como administrador para acceder.",
        variant: "destructive",
      });
    }
  }, [searchParams]);

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return null;
}
