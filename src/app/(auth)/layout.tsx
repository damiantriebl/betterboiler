"use client";

import Logo from "@/components/custom/Logo";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSignUp = pathname === "/sign-up";

  return (
    <>
      {/* Diseño móvil y tablet - simple */}
      <div className="min-h-screen flex items-center justify-center bg-gray-50 lg:hidden">
        <div className="max-w-md w-full space-y-8 p-6">
          <div className="flex justify-center">
            <Logo className="w-48 h-32" />
          </div>
          {children}
        </div>
      </div>

      {/* Diseño desktop - con nebulosa y logo grande */}
      <div className="hidden lg:flex min-h-screen relative">
        {/* Fondo de nebulosa con Next.js Image para mejor performance */}
        <div className="absolute inset-0">
          <Image
            src="/nebulosa.webp"
            alt="Nebulosa background"
            fill
            className="object-cover"
            priority
            quality={85}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
          />
        </div>

        {/* Overlay para mejorar contraste */}
        <div className="absolute inset-0 bg-black/20 z-10" />

        {/* Partículas flotantes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rounded-full animate-pulse" />
          <div className="absolute top-3/4 left-1/3 w-1 h-1 bg-blue-300/30 rounded-full animate-ping" />
          <div className="absolute top-1/2 right-1/4 w-3 h-3 bg-purple-300/20 rounded-full animate-pulse delay-1000" />
          <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-white/40 rounded-full animate-ping delay-2000" />
          <div className="absolute bottom-1/4 left-1/2 w-2 h-2 bg-indigo-300/25 rounded-full animate-pulse delay-500" />
        </div>

        {/* Panel izquierdo - Logo y branding */}
        <div className="flex-1 flex flex-col justify-center items-center relative z-30 px-12">
          <div className="flex flex-col items-center justify-center min-h-screen">
            {/* Logo extra grande */}
            <div className="relative z-10 flex items-center justify-center">
              {/* Logo con tamaño específico */}
              <Logo
                className="w-80 h-56 lg:w-96 lg:h-72 xl:w-[480px] xl:h-[340px]"
                style={{
                  filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.8))",
                }}
              />
            </div>

            {/* Efecto de resplandor sutil alrededor del logo */}
            <div className="absolute w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>
        </div>

        {/* Panel derecho - Formulario */}
        <div className="flex-1 flex items-center justify-center bg-white/95 backdrop-blur-sm relative z-30">
          <div className="max-w-md w-full space-y-8 px-8">{children}</div>
        </div>
      </div>
    </>
  );
}
