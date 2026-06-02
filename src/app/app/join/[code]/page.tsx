import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { JoinClickwrap } from "@/components/groups/JoinClickwrap";
import { GROUP_TYPE_LABEL, GROUP_ROLE_LABEL, type GroupRole, type GroupType } from "@/lib/groups/types";

export const metadata = { title: "Unisciti a un gruppo — Shakh" };

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.rpc("invite_preview", { invite_code: code });
  const preview = (data as Preview[] | null)?.[0] ?? null;

  return (
    <div className="mx-auto max-w-lg space-y-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Invito a un gruppo</CardTitle>
          {preview && preview.valid ? (
            <CardDescription>
              Sei stato invitato a unirti a <span className="text-text">{preview.group_name}</span>{" "}
              ({GROUP_TYPE_LABEL[preview.group_type]}) come{" "}
              {GROUP_ROLE_LABEL[preview.role_in_group].toLowerCase()}.
            </CardDescription>
          ) : (
            <CardDescription>Questo invito non è valido, è scaduto o è già stato usato.</CardDescription>
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
              Vai ai gruppi
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
