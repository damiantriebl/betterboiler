"use client";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { DialogDescription } from "@radix-ui/react-dialog";
import Image from "next/image";
import { useState } from "react";

interface Props {
  imgLow: string;
  imgHd: string;
  alt: string;
  organization: string;
  lowSize?: { width: number; height: number };
  hdSize?: { width: number; height: number };
}

const ImageZoom = ({
  imgHd,
  alt,
  organization,
  lowSize = { width: 40, height: 40 },
  hdSize = { width: 1200, height: 1200 },
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const imgLow = imgHd.replace("_400", "_100");
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Ampliar imagen: ${alt}`}
          className="rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Image
            src={imgLow}
            alt={alt}
            width={lowSize.width}
            height={lowSize.height}
            priority
            unoptimized
            className="rounded cursor-pointer transition-transform duration-200 hover:scale-110"
          />
        </button>
      </DialogTrigger>

      <DialogContent
        className="flex flex-col items-center justify-center"
        aria-label={`Vista ampliada de ${alt}`}
      >
        <DialogTitle>{organization}</DialogTitle>
        <DialogDescription className="sr-only">Imagen ampliada de {organization}</DialogDescription>
        <Image
          src={imgHd}
          alt={alt}
          width={hdSize.width}
          height={hdSize.height}
          className={cn(
            "transition-transform duration-300 ease-in-out rounded shadow-xl",
            isOpen ? "scale-100" : "scale-95 opacity-0",
          )}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ImageZoom;
