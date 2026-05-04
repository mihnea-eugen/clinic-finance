import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  unpaid: { label: "Neachitată", class: "bg-red-50 text-red-700" },
  partial: { label: "Parțial", class: "bg-yellow-50 text-yellow-700" },
  paid: { label: "Achitată", class: "bg-green-50 text-green-700" },
  cancelled: { label: "Anulată", class: "bg-slate-100 text-slate-500" },
  overdue: { label: "Restantă", class: "bg-red-100 text-red-800" },
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const typeFilter = params.type || "";
  const statusFilter = params.status || "";

  let query = supabase
    .from("invoices")
    .select("*")
    .eq("user_id", user.id)
    .order("invoice_date", { ascending: false });

  if (typeFilter) query = query.eq("invoice_type", typeFilter);
  if (statusFilter) query = query.eq("status", statusFilter);

  const { data: invoices } = await query;

  const totalIssued = (invoices || []).filter(i => i.invoice_type === "issued" && i.status !== "cancelled").reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const totalReceived = (invoices || []).filter(i => i.invoice_type === "received" && i.status !== "cancelled").reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const totalUnpaid = (invoices || []).filter(i => i.invoice_type === "issued" && ["unpaid", "partial", "overdue"].includes(i.status)).reduce((s, i) => s + Number(i.total_amount || 0) - Number(i.amount_paid || 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Facturi</h1>
      </div>

      {/* Sumar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-xs text-slate-500">Total emise</p>
          <p className="text-lg font-bold text-slate-800">{formatCurrency(totalIssued)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-xs text-slate-500">Total primite</p>
          <p className="text-lg font-bold text-slate-800">{formatCurrency(totalReceived)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-xs text-slate-500">Neîncasat</p>
          <p className="text-lg font-bold text-red-500">{formatCurrency(totalUnpaid)}</p>
        </div>
      </div>

      {/* Filtre */}
      <form className="bg-white rounded-xl border border-slate-100 p-4 flex gap-3 items-end">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Tip</label>
          <select name="type" defaultValue={typeFilter}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-400">
            <option value="">Toate</option>
            <option value="issued">Emise</option>
            <option value="received">Primite</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Status</label>
          <select name="status" defaultValue={statusFilter}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-400">
            <option value="">Toate</option>
            <option value="unpaid">Neachitate</option>
            <option value="paid">Achitate</option>
            <option value="overdue">Restante</option>
          </select>
        </div>
        <button type="submit" className="bg-brand-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-brand-700">
          Filtrează
        </button>
      </form>

      {/* Tabel facturi */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {!invoices?.length ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Nicio factură. Încarcă prima factură prin Upload.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Nr. factură</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Tip</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Contraparte</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Dată</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Scadență</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Status</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-400">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoices.map((inv) => {
                const s = STATUS_LABELS[inv.status] || STATUS_LABELS.unpaid;
                return (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-700">{inv.invoice_number || "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium
                        ${inv.invoice_type === "issued" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}`}>
                        {inv.invoice_type === "issued" ? "Emisă" : "Primită"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{inv.counterpart_name || "—"}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{inv.invoice_date ? formatDate(inv.invoice_date) : "—"}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{inv.due_date ? formatDate(inv.due_date) : "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${s.class}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-800">
                      {formatCurrency(Number(inv.total_amount || 0))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
