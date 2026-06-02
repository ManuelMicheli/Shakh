import Link from "next/link";
import { BRAND_NAME } from "@/config/brand";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <Link
        href="/"
        className="mb-8 font-display text-2xl font-semibold tracking-tight"
      >
        {BRAND_NAME}
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
