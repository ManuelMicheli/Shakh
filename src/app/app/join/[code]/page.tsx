import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient, getUser } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { JoinClickwrap } from "@/components/groups/JoinClickwrap";
import { GROUP_TYPE_LABEL, GROUP_ROLE_LABEL, type GroupRole, type GroupType } from "@/lib/groups/types";

export async function generateMetadata() {
  const t = await getTranslations("metadata");
  return { title: t("joinGroup") };
}

interface PageProps {
  params: Promise<{ code: string }>;
}

interface Preview {
  group_name: string;
  group_type: GroupType;
  role_in_group: GroupRole;
  valid: boolean;
}

export default async function JoinPage({ params }: PageProps) {
  const { code } = await params;
  const supabase = await createClient();
  const user = await getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.rpc("invite_preview", { invite_code: code });
  const preview = (data as Preview[] | null)?.[0] ?? null;

  return (
    <div className="mx-auto max-w-lg space-y-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Group invite</CardTitle>
          {preview && preview.valid ? (
            <CardDescription>
              You&apos;ve been invited to join <span className="text-text">{preview.group_name}</span>{" "}
              ({GROUP_TYPE_LABEL[preview.group_type]}) as{" "}
              {GROUP_ROLE_LABEL[preview.role_in_group].toLowerCase()}.
            </CardDescription>
          ) : (
            <CardDescription>This invite is invalid, has expired, or has already been used.</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {preview && preview.valid ? (
            <JoinClickwrap code={code} />
          ) : (
            <Link
              href="/app/gruppi"
              className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm font-medium text-text hover:bg-surface-2"
            >
              Go to groups
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
