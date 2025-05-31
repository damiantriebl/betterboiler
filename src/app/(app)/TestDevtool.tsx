"use client";
import { useSessionStore } from "@/stores/SessionStore";

export default function TestDevtools() {
  const setSession = useSessionStore((s) => s.setSession);

  return (
    <button type="button" onClick={() => setSession({ userName: "Prueba" })}>
      Cambiar usuario
    </button>
  );
}
