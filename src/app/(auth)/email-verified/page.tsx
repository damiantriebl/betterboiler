import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

export default async function EmailVerifiedPage() {
  return (
    <div className="flex flex-col items-center justify-center grow p-4">
      <h1 className="mb-4 text-2xl font-bold text-green-500">Email Verificado!</h1>
      <p className="mb-4 text-gray-500">Tu email fue verificado correctamente</p>
      <Link href="/" className={buttonVariants({ variant: "default" })}>
        Go to Home
      </Link>
    </div>
  );
}
