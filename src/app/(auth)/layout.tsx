import { Think } from "ui/think";
import { getTranslations } from "next-intl/server";
import { FlipWords } from "ui/flip-words";
import { BackgroundPaths } from "ui/background-paths";
import Image from "next/image";

export default async function AuthLayout({
  children,
}: { children: React.ReactNode }) {
  const t = await getTranslations("Auth.Intro");
  return (
    <main className="relative w-full flex flex-col h-screen">
      <div className="flex-1">
        <div className="flex min-h-screen w-full">
          <div
            className="hidden lg:flex lg:w-1/2 border-r flex-col p-18 relative"
            style={{ backgroundColor: "#004cf9" }}
          >
            <div className="absolute inset-0 w-full h-full">
              <BackgroundPaths />
            </div>
            <h1 className="text-xl font-semibold flex items-center gap-3 animate-in fade-in duration-1000">
              <Image
                src="/logo-white.png"
                alt="Chat Bot"
                width={64}
                height={17}
                className="w-32 h-[34px]"
                priority
              />
            </h1>
            <div className="flex-1" />
            <Think />
            <FlipWords
              words={[t("description")]}
              className="mb-4 text-muted-foreground -ml-3 mt-2"
            />
          </div>

          <div className="w-full lg:w-1/2 p-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
