import { renderIcon } from "@/lib/pwa/render-icon";

export const dynamic = "force-static";

// Maskable: sfondo pieno a tutto bordo, pezzo nella safe-zone (~62%).
export function GET() {
  return renderIcon({ size: 512, scale: 0.62, rounded: false });
}
