"use client";

import { toast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();

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
