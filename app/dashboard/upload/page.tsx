"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { cn, DOC_TYPE_LABELS } from "@/lib/utils";
import type { DocType } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

type Step = "select" | "uploading" | "extracted" | "saved" | "error";

const DOC_TYPES: DocType[] = [
  "extras_bancar", "factura_emisa", "factura_primita",
  "bon", "fisa_clinica", "programator", "balanta", "bilant", "alt"
];

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocType>("programator");
  const [step, setStep] = useState<Step>("select");
  const [progress, setProgress] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [extractedData, setExtractedData] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState("");
  const [clinics, setClinics] = useState<Array<{id: string; name: string}>>([]);
  const [selectedClinic, setSelectedClinic] = useState("");

  // Incarca clinicile pentru fisa_clinica
  const loadClinics = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("clinics").select("id, name").order("name");
    setClinics(data || []);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      setFile(acceptedFiles[0]);
      setStep("select");
      setExtractedData(null);
      setError("");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".webp", ".heic"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  const handleUpload = async () => {
    if (!file || !docType) return;

    setStep("uploading");
    setProgress("Se încarcă fișierul...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("doc_type", docType);
      if (selectedClinic) formData.append("clinic_id", selectedClinic);

      setProgress("Se extrag datele cu AI (10-30 secunde)...");

      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Eroare server");
      }

      setExtractedData(result.extracted_data);
      setStep("extracted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută");
      setStep("error");
    }
  };

  const reset = () => {
    setFile(null);
    setStep("select");
    setExtractedData(null);
    setError("");
    setSelectedClinic("");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Încarcă document</h1>
        <p className="text-slate-500 text-sm mt-0.5">AI extrage automat datele financiare din orice document</p>
      </div>

      {/* Step 1: Selectare tip document */}
      <div className="bg-white rounded-xl border border-slate-100 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">1. Tip document</h2>
        <div className="grid grid-cols-3 gap-2">
          {DOC_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => {
                setDocType(type);
                if (type === "fisa_clinica") loadClinics();
              }}
              className={cn(
                "px-3 py-2 text-xs rounded-lg border text-left transition-all",
                docType === type
                  ? "bg-brand-50 border-brand-300 text-brand-700 font-medium"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              )}
            >
              {DOC_TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        {docType === "fisa_clinica" && (
          <div className="mt-3">
            <label className="text-xs text-slate-600 font-medium block mb-1">Clinică colaboratoare</label>
            <select
              value={selectedClinic}
              onChange={(e) => setSelectedClinic(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400"
            >
              <option value="">Selectează clinica...</option>
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Step 2: Upload fisier */}
      <div className="bg-white rounded-xl border border-slate-100 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">2. Fișier (imagine sau PDF)</h2>

        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
            isDragActive ? "border-brand-400 bg-brand-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
            file ? "border-green-300 bg-green-50" : ""
          )}
        >
          <input {...getInputProps()} />
          {file ? (
            <div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-700">{file.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{(file.size / 1024).toFixed(0)} KB</p>
              <p className="text-xs text-brand-600 mt-2">Click pentru a schimba fișierul</p>
            </div>
          ) : (
            <div>
              <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-slate-600">
                {isDragActive ? "Lasă fișierul aici..." : "Trage fișierul sau click pentru selectare"}
              </p>
              <p className="text-xs text-slate-400 mt-1">JPG, PNG, HEIC, PDF · Max 50MB</p>
            </div>
          )}
        </div>
      </div>

      {/* Upload button */}
      {file && step !== "uploading" && step !== "extracted" && (
        <button
          onClick={handleUpload}
          className="w-full bg-brand-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          Extrage date cu AI
        </button>
      )}

      {/* Loading state */}
      {step === "uploading" && (
        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
          <div className="w-10 h-10 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-600">{progress}</p>
        </div>
      )}

      {/* Rezultat extragere */}
      {step === "extracted" && extractedData && (
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-green-700">Date extrase cu succes</h2>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-slate-700 font-medium mb-1">Rezumat</p>
            <p className="text-sm text-slate-600">{String(extractedData.summary || "")}</p>
          </div>

          {/* Tranzactii extrase (extras bancar) */}
          {Array.isArray(extractedData.transactions) && (extractedData.transactions as unknown[]).length > 0 ? (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">
                {(extractedData.transactions as unknown[]).length} tranzacții identificate
              </p>
              <div className="max-h-60 overflow-y-auto space-y-1.5">
                {(extractedData.transactions as Array<{date: string; description: string; amount: number; type: string; payment_method: string}>).map((tx, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-slate-50 rounded-lg text-xs">
                    <div>
                      <span className="text-slate-500">{tx.date}</span>
                      <span className="mx-2 text-slate-300">·</span>
                      <span className="text-slate-700">{tx.description}</span>
                    </div>
                    <span className={`font-semibold ${tx.type === "income" ? "text-green-600" : "text-red-500"}`}>
                      {tx.type === "income" ? "+" : "-"}{Number(tx.amount).toFixed(2)} RON
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Programator */}
          {extractedData.report_date && (
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-xs text-green-600">Cash</p>
                <p className="text-sm font-bold text-green-700">{Number(extractedData.total_cash || 0).toFixed(2)} RON</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-xs text-blue-600">Card</p>
                <p className="text-sm font-bold text-blue-700">{Number(extractedData.total_card || 0).toFixed(2)} RON</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <p className="text-xs text-purple-600">Transfer</p>
                <p className="text-sm font-bold text-purple-700">{Number(extractedData.total_transfer || 0).toFixed(2)} RON</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button
              onClick={reset}
              className="flex-1 bg-green-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Salvat! Încarcă alt document
            </button>
            <button
              onClick={reset}
              className="px-4 bg-slate-100 text-slate-600 rounded-xl py-2.5 text-sm hover:bg-slate-200 transition-colors"
            >
              Resetează
            </button>
          </div>
        </div>
      )}

      {/* Eroare */}
      {step === "error" && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-5">
          <p className="text-sm font-semibold text-red-700 mb-1">Eroare</p>
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={reset} className="mt-3 text-xs text-red-600 underline">
            Încearcă din nou
          </button>
        </div>
      )}
    </div>
  );
}
