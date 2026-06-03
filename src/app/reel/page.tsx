import Link from "next/link";
import type { Metadata } from "next";
import { ReelPlayer } from "@/components/reel/ReelPlayer";
import { Button } from "@/components/ui/button";
import { decodeReel } from "@/lib/reel/payload";

export const metadata: Metadata = {
  title: "Reel — Shakh",
  robots: { index: false, follow: false },
};

export default async function PublicReelPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const { d } = await searchParams;
  const reel = decodeReel(d);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-6 p-6">
      {reel ? (
        <>
          <ReelPlayer data={reel} />
          <div className="text-center">
            <p className="text-sm text-text-muted">Una bella mossa, catturata su Shakh.</p>
            <Link href="/" className="mt-2 inline-block">
              <Button variant="secondary" size="sm">
                Scopri Shakh
              </Button>
            </Link>
          </div>
        </>
      ) : (
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold">Reel non disponibile</h1>
          <p className="mt-2 text-text-muted">Il link non è valido o è incompleto.</p>
          <Link href="/" className="mt-4 inline-block">
            <Button>Vai a Shakh</Button>
          </Link>
        </div>
      )}
    </main>
  );
}
