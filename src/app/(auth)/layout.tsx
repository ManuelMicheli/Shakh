import Link from "next/link";
import { BRAND_NAME } from "@/config/brand";
import { BrandMark } from "@/components/layout/BrandMark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 font-display text-2xl font-semibold tracking-tight"
      >
        <BrandMark className="h-6 w-6 shrink-0" />
        {BRAND_NAME}
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
