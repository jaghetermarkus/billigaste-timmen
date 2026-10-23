import { AppNav } from "@/components/app-nav";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-fraunces",
});

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Billigaste timmen",
  description:
    "Billigaste timmen är elspotpriser för el i Sverige. Vi visar dig när elen är billigast och dyrast.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef0f3" },
    { media: "(prefers-color-scheme: dark)", color: "#06080b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="sv"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fraunces.variable,
        "font-sans",
        inter.variable,
      )}
    >
      <body className="flex min-h-lvh flex-col bg-transparent pb-28">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <header className="relative z-10 flex justify-end p-4">
            <ThemeToggle />
          </header>
          {children}
          <footer className="px-5 pb-8 text-center text-[10px] text-muted-foreground/45">
            <p>
              Elpriser tillhandahålls av{" "}
              <a
                href="https://www.elprisetjustnu.se"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-muted-foreground/30 underline-offset-2 hover:text-foreground"
              >
                Elpriset just nu.se
              </a>
              . Spotpris exkl. moms och avgifter.
            </p>
          </footer>
          <AppNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
