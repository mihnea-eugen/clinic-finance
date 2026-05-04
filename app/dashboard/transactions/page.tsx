import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate, PAYMENT_METHOD_LABELS } from "@/lib/utils";
import { format, subDays, startOfMonth } from "date-fns";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const from = params.from || format(startOfMonth(new Date()), "yyyy-MM-dd");
  const to = params.to || format(new Date(), "yyyy-MM-dd");
  const typeFilter = params.type || "";
  const methodFilter = params.method || "";

  let query = supabase
    .from("transactions")
    .select("*, clinics(name)")
    .eq("user_id", user.id)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (typeFilter) query = query.eq("type", typeFilter);
  if (methodFilter) query = query.eq("payment_method", methodFilter);

  const { data: transactions } = await query;

  const totalIncome = (transactions || []).filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = (transactions || []).filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const totalCash = (transactions || []).filter(t => t.type === "income" && t.payment_method === "cash").reduce((s, t) => s + Number(t.amount), 0);
  const totalCard = (transactions || []).filter(t => t.type === "income" && t.payment_method === "card").reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Tranzacții</h1>
      </div>

      {/* Filtre */}
      <form className="bg-white rounded-xl border border-slate-100 p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-slate-500 block mb-1">De la</label>
          <input type="date" name="from" defaultValue={from}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-400" />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Până la</label>
          <input type="date" name="to" defaultValue={to}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-400" />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Tip</label>
          <select name="type" defaultValue={typeFilter}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-400">
            <option value="">Toate</option>
            <option value="income">Venituri</option>
            <option value="expense">Cheltuieli</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Metodă</label>
          <select name="method" defaultValue={methodFilter}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-400">
            <option value="">Toate</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>
        <button type="submit"
          className="bg-brand-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-brand-700 transition-colors">
          Filtrează
        </button>
      </form>

      {/* Sumar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-xs text-slate-500">Venituri</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-xs text-slate-500">Cheltuieli</p>
          <p className="text-lg font-bold text-red-500">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-xs text-slate-500">Cash</p>
          <p className="text-lg font-bold text-slate-700">{formatCurrency(totalCash)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-xs text-slate-500">Card</p>
          <p className="text-lg font-bold text-slate-700">{formatCurrency(totalCard)}</p>
        </div>
      </div>

      {/* Tabel tranzactii */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {!transactions?.length ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Nicio tranzacție în perioada selectată
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Data</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Descriere</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Metodă</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Categorie</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-400">Sumă</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{formatDate(tx.date)}</td>
                  <td className="px-5 py-3 text-slate-800">
                    <div>{tx.description || "—"}</div>
                    {tx.clinics?.name && (
                      <div className="text-xs text-slate-400">{tx.clinics.name}</div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium
                      ${tx.payment_method === "cash" ? "bg-amber-50 text-amber-700" :
                        tx.payment_method === "card" ? "bg-blue-50 text-blue-700" :
                        "bg-purple-50 text-purple-700"}`}>
                      {PAYMENT_METHOD_LABELS[tx.payment_method] || tx.payment_method}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{tx.category || "—"}</td>
                  <td className={`px-5 py-3 text-right font-semibold whitespace-nowrap
                    ${tx.type === "income" ? "text-green-600" : "text-red-500"}`}>
                    {tx.type === "income" ? "+" : "-"}{formatCurrency(Number(tx.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
