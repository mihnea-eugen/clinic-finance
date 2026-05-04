import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type DocType =
  | "extras_bancar"
  | "factura_emisa"
  | "factura_primita"
  | "bon"
  | "fisa_clinica"
  | "programator"
  | "balanta"
  | "bilant"
  | "alt";

export interface ExtractedTransaction {
  date: string;        // ISO format: YYYY-MM-DD
  description: string;
  amount: number;
  type: "income" | "expense";
  payment_method: "cash" | "card" | "transfer" | "other";
  category?: string;
  reference?: string;
}

export interface ExtractedDocument {
  doc_type: DocType;
  doc_date?: string;
  summary: string;
  // Pentru extras bancar
  transactions?: ExtractedTransaction[];
  bank_name?: string;
  account_iban?: string;
  period_start?: string;
  period_end?: string;
  opening_balance?: number;
  closing_balance?: number;
  // Pentru factura
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  counterpart_name?: string;
  counterpart_cui?: string;
  subtotal?: number;
  tax_rate?: number;
  tax_amount?: number;
  total_amount?: number;
  invoice_type?: "issued" | "received";
  // Pentru bon
  bon_date?: string;
  bon_total?: number;
  bon_items?: Array<{ name: string; price: number; quantity?: number }>;
  // Pentru fisa clinica
  clinic_name?: string;
  period?: string;
  amount_owed?: number;
  // Pentru programator (raport zilnic)
  report_date?: string;
  total_cash?: number;
  total_card?: number;
  total_transfer?: number;
  total_income?: number;
  procedures_count?: number;
  procedures?: Array<{ name: string; price: number; payment_method: string }>;
  // Erori/observatii
  warnings?: string[];
}

function getPromptForDocType(docType: DocType): string {
  const prompts: Record<DocType, string> = {
    extras_bancar: `Analizezi un extras de cont bancar românesc.
Extrage:
- Perioada acoperită (period_start, period_end în format YYYY-MM-DD)
- Banca și IBAN dacă sunt vizibile
- Soldul de deschidere și închidere
- TOATE tranzacțiile individuale cu: data (YYYY-MM-DD), descriere, suma (mereu pozitivă), tip (income/expense), metodă plată (transfer pentru viramente), referință/nr. tranzacție
- Câmpul "type": "income" pentru credit/intrare, "expense" pentru debit/ieșire`,

    factura_emisa: `Analizezi o factură EMISĂ (de Dr. Diana către client).
Extrage: numărul facturii, data, scadența, numele clientului, CUI, subtotal, TVA%, valoare TVA, total.
invoice_type: "issued"`,

    factura_primita: `Analizezi o factură PRIMITĂ (de la furnizor).
Extrage: numărul facturii, data, scadența, numele furnizorului, CUI, subtotal, TVA%, valoare TVA, total.
invoice_type: "received"`,

    bon: `Analizezi un bon fiscal sau chitanță.
Extrage: data, totalul, lista de produse/servicii dacă sunt vizibile.
Consideră ca "expense" dacă e bon de cumpărături, "income" dacă e chitanță de plată primită.`,

    fisa_clinica: `Analizezi o fișă de la o clinică colaboratoare (ex: Clinica Pogany).
Extrage: numele clinicii, perioada acoperită, suma totală datorată, eventual defalcarea pe proceduri.`,

    programator: `Analizezi o copie din programator (raport zilnic de încasări).
Extrage: data, total cash, total card/POS, total virament/transfer, total general, numărul de proceduri/consultații.
Dacă sunt proceduri individuale listate, extrage-le cu: nume procedură, preț, metodă plată.`,

    balanta: `Analizezi o balanță contabilă.
Extrage perioada, totalurile principale (venituri, cheltuieli, solduri).
Oferă un summary clar al situației financiare.`,

    bilant: `Analizezi un bilanț contabil.
Extrage data, activele totale, pasivele totale, capitalul propriu.`,

    alt: `Analizezi un document financiar nespecificat.
Încearcă să extragi orice informație financiară relevantă: date, sume, descrieri.`,
  };

  return prompts[docType];
}

export async function extractFromImage(
  imageBase64: string,
  mimeType: string,
  docType: DocType
): Promise<ExtractedDocument> {
  const systemPrompt = `Ești un expert contabil român care extrage date structurate din documente financiare.
Returnezi EXCLUSIV JSON valid, fără text în afara JSON-ului.
Toate sumele sunt în RON (lei), mereu pozitive.
Datele sunt în format ISO: YYYY-MM-DD.
Dacă un câmp nu este vizibil sau nu există, omite-l din JSON (nu pune null, nu pune "").
${getPromptForDocType(docType)}

Structura JSON de returnat (include doar câmpurile relevante):
{
  "doc_type": "${docType}",
  "doc_date": "YYYY-MM-DD",
  "summary": "rezumat 1-2 propoziții în română",
  ... (câmpurile specifice tipului de document)
  "warnings": ["orice neclaritate sau problemă observată"]
}`;

  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: `Extrage datele din acest document financiar de tip "${docType}". Returnează JSON pur, fără markdown, fără text înaintea sau după JSON.`,
          },
        ],
      },
    ],
    system: systemPrompt,
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Răspuns neașteptat de la AI");
  }

  // Curăță și parsează JSON
  let jsonText = content.text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    return JSON.parse(jsonText) as ExtractedDocument;
  } catch {
    throw new Error(`Nu s-a putut parsa răspunsul AI: ${jsonText.slice(0, 200)}`);
  }
}

// Pentru PDF-uri: convertim la imagine înainte (sau trimitem ca text dacă e posibil)
export async function extractFromPdfText(
  pdfText: string,
  docType: DocType
): Promise<ExtractedDocument> {
  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Document financiar (${docType}):\n\n${pdfText}\n\nExtrage datele ca JSON pur.`,
      },
    ],
    system: `Ești un expert contabil român. ${getPromptForDocType(docType)} Returnează EXCLUSIV JSON valid. Sume mereu pozitive în RON. Date în format YYYY-MM-DD.`,
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Răspuns neașteptat");

  let jsonText = content.text.trim().replace(/^```json?\n?/, "").replace(/\n?```$/, "");

  return JSON.parse(jsonText) as ExtractedDocument;
}
