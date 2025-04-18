import Logo from "@/components/custom/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-row">
      <div
        className="hidden md:flex w-1/2 min-h-screen justify-center bg-cover bg-center"
        style={{ backgroundImage: "url(/nebulosa.webp)" }}
      >
        <div className=" flex justify-center items-center w-1/2">
          <Logo />
        </div>
      </div>
      <div className="flex w-full md:w-1/2 items-center justify-center">{children}</div>
    </div>
  );
}
