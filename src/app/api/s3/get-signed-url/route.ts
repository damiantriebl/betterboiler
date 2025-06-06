// app/api/s3/get-signed-url/route.ts
import { getSignedUrl } from "@/lib/s3-unified";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  const operation = searchParams.get("operation");

  if (!name || !operation) {
    return NextResponse.json({ failure: "Parámetros inválidos" }, { status: 400 });
  }

  const result = await getSignedUrl(name, operation as "put" | "get");

  if ("failure" in result) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
