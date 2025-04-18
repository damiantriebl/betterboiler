import type { Crop } from "react-image-crop";

export default function getCroppedImg(imageSrc: string, pixelCrop: Crop): Promise<Blob | null> {
  const image = new Image();
  image.src = imageSrc;

  return new Promise((resolve, reject) => {
    image.onload = () => {
      const canvas = document.createElement("canvas");
      if (!pixelCrop.width || !pixelCrop.height) {
        return reject(new Error("Crop dimensions are missing"));
      }
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return reject(new Error("Failed to get canvas context"));
      }

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height,
      );

      canvas.toBlob((blob) => {
        resolve(blob);
      }, "image/webp");
    };

    image.onerror = (error) => reject(error);
  });
}
