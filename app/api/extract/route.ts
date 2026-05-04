import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractFromImage, type DocType } from "@/lib/ai/extract";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verificam autentificarea
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const docType = formData.get("doc_type") as DocType;
    const clinicId = formData.get("clinic_id") as string | null;

    if (!file || !docType) {
      return NextResponse.json({ error: "Fișier și tip document sunt obligatorii" }, { status: 400 });
    }

    // 1. Upload fișier în Supabase Storage
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("finance-docs")
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: `Upload eșuat: ${uploadError.message}` }, { status: 500 });
    }

    // 2. Salvam documentul în DB (neprocesat)
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        file_path: filePath,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        doc_type: docType,
        clinic_id: clinicId || null,
        processed: false,
      })
      .select()
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: "Eroare salvare document" }, { status: 500 });
    }

    // 3. Extragere AI
    let extractedData = null;
    let extractionError = null;

    try {
      // Convertim la base64 pentru Claude Vision
      const base64 = Buffer.from(fileBuffer).toString("base64");
      const mimeType = file.type || "image/jpeg";

      extractedData = await extractFromImage(base64, mimeType, docType);

      // 4. Update document cu datele extrase
      await supabase
        .from("documents")
        .update({
          processed: true,
          extracted_data: extractedData,
          doc_date: extractedData.doc_date || extractedData.report_date || extractedData.invoice_date || extractedData.bon_date,
        })
        .eq("id", doc.id);

      // 5. Auto-creare tranzactii din extras bancar
      if (docType === "extras_bancar" && extractedData.transactions?.length) {
        const txRows = extractedData.transactions.map((tx) => ({
          user_id: user.id,
          document_id: doc.id,
          date: tx.date,
          description: tx.description,
          amount: Math.abs(tx.amount),
          type: tx.type,
          payment_method: tx.payment_method,
          category: tx.category || null,
          reference: tx.reference || null,
          confirmed: false,
        }));

        await supabase.from("transactions").insert(txRows);
      }

      // 6. Auto-creare raport zilnic din programator
      if (docType === "programator" && extractedData.report_date) {
        await supabase.from("daily_reports").upsert({
          user_id: user.id,
          document_id: doc.id,
          date: extractedData.report_date,
          total_cash: extractedData.total_cash || 0,
          total_card: extractedData.total_card || 0,
          total_transfer: extractedData.total_transfer || 0,
          procedures_count: extractedData.procedures_count || 0,
        }, { onConflict: "user_id,date" });
      }

      // 7. Auto-creare fisa clinica
      if (docType === "fisa_clinica" && extractedData.amount_owed && clinicId) {
        await supabase.from("clinic_bills").insert({
          user_id: user.id,
          clinic_id: clinicId,
          document_id: doc.id,
          amount_owed: extractedData.amount_owed,
          amount_paid: 0,
          status: "pending",
          notes: extractedData.summary,
        });
      }

    } catch (err) {
      extractionError = err instanceof Error ? err.message : "Eroare extragere AI";
      await supabase
        .from("documents")
        .update({ extraction_error: extractionError })
        .eq("id", doc.id);
    }

    return NextResponse.json({
      success: true,
      document_id: doc.id,
      extracted_data: extractedData,
      extraction_error: extractionError,
    });

  } catch (err) {
    console.error("Extract API error:", err);
    return NextResponse.json(
      { error: "Eroare internă server" },
      { status: 500 }
    );
  }
}
