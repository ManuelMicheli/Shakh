import { renderIcon } from "@/lib/pwa/render-icon";

export const dynamic = "force-static";

export function GET() {
  return renderIcon({ size: 192, rounded: true });
}
