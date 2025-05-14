import { getLogoUrl } from "@/components/custom/OrganizationLogo";

export async function fetchImageAsBase64(pathOrUrl: string): Promise<string> {
  const signedUrl = await getLogoUrl(pathOrUrl);
  const res = await fetch(signedUrl);

  if (!res.ok) throw new Error('No se pudo obtener la imagen');

  const contentType = res.headers.get('content-type') ?? 'image/png';
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  console.log('base64', base64);
  return `data:${contentType};base64,${base64}`;
}
