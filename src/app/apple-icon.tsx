import { renderIcon } from "@/lib/pwa/render-icon";

// Next genera /apple-icon e inietta il <link rel="apple-touch-icon">.
// iOS applica la propria maschera: sfondo quadrato pieno, niente raggi.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return renderIcon({ size: 180, scale: 0.68, rounded: false });
}
