import { Diamond } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface AuthShellProps {
  children: React.ReactNode;
  description: string;
  eyebrow: string;
  footer: React.ReactNode;
  title: string;
}

export function AuthShell({ children, description, eyebrow, footer, title }: AuthShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#06110d] px-4 py-8 text-[#f5edd9] sm:px-6 sm:py-12">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center opacity-35"
        style={{ backgroundImage: 'url("/main-image/background-nothing.jpg")' }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(29,78,55,0.2),rgba(2,8,5,0.92)_75%)]" />
      <Image aria-hidden="true" alt="" src="/cards-image/spades/Spades-K.svg.png" width={180} height={252} className="absolute -left-16 top-16 hidden rotate-[-16deg] opacity-15 drop-shadow-2xl md:block" />
      <Image aria-hidden="true" alt="" src="/cards-image/Hearts/Hearts-C.svg.png" width={180} height={252} className="absolute -right-12 bottom-10 hidden rotate-[14deg] opacity-15 drop-shadow-2xl md:block" />

      <div className="relative mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md flex-col justify-center">
        <Link href="/home" className="mx-auto mb-7 flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d2b66e]" aria-label="Gin Rummy home">
          <Diamond className="h-3 w-3 fill-[#d1b46c] text-[#d1b46c]" />
          <span className="font-serif text-sm font-semibold tracking-[0.2em] text-[#fff4d6]">GIN RUMMY</span>
          <span className="border-l border-[#9c8248]/45 pl-3 text-[9px] font-semibold uppercase tracking-[0.25em] text-[#cfc4aa]/60">Dozenal</span>
        </Link>

        <section className="rounded-sm border border-[#b89b58]/45 bg-[#091912]/95 p-6 shadow-[0_28px_80px_rgba(0,0,0,0.55)] backdrop-blur-sm sm:p-8">
          <div className="mb-7 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#cbb270]">{eyebrow}</p>
            <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-[#fff7df]">{title}</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#d8d1bf]/70">{description}</p>
          </div>
          {children}
          <div className="mt-7 border-t border-[#9c8248]/25 pt-6 text-center text-sm text-[#d8d1bf]/70">{footer}</div>
        </section>

        <Link href="/home" className="mx-auto mt-6 text-xs uppercase tracking-[0.18em] text-[#d0c4a8]/55 transition-colors hover:text-[#ead28d]">
          Back to the table
        </Link>
      </div>
    </main>
  );
}
