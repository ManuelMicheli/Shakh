import { headers } from "next/headers";

/**
 * Inietta dati strutturati JSON-LD. Lo script è firmato col nonce della
 * richiesta (CSP strict, §2). type=application/ld+json non viene eseguito,
 * è solo metadato per i crawler.
 */
export async function JsonLd({ data }: { data: object | object[] }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const json = JSON.stringify(data);
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
