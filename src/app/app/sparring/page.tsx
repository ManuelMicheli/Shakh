import { getTranslations } from "next-intl/server";
import { SparringBoard } from "@/components/sparring/SparringBoard";

export async function generateMetadata() {
  const t = await getTranslations("metadata");
  return { title: t("sparring") };
}

export default function SparringPage() {
  return (
    <div className="space-y-6">
      <SparringBoard />
    </div>
  );
}
