export default function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<Blob> {
    const image = new Image();
    image.src = imageSrc;
  
    return new Promise((resolve, reject) => {
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;
  
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(
          image,
          pixelCrop.x,
          pixelCrop.y,
          pixelCrop.width,
          pixelCrop.height,
          0,
          0,
          pixelCrop.width,
          pixelCrop.height
        );
  
        canvas.toBlob((file) => {
          if (file) resolve(file);
          else reject(new Error('Error al recortar imagen'));
        }, 'image/jpeg');
      };
  
      image.onerror = () => reject(new Error('No se pudo cargar la imagen original'));
    });
  }
  