import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import PLChart from "@/components/dashboard/pl-chart";

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // P&L lunar ultimele 12 luni
  const { data: monthlyPL } = await supabase
    .from("v_monthly_pl")
    .select("*")
    .eq("user_id", user.id)
    .order("month", { ascending: false })
    .limit(12);

  // Defalcare pe categorie luna curenta
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const monthEndStr = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, "0")}-${String(monthEnd.getDate()).padStart(2, "0")}`;

  const { data: categoryBreakdown } = await supabase
    .from("transactions")
    .select("type, category, payment_method, amount")
    .eq("user_id", user.id)
    .gte("date", monthStart)
    .lte("date", monthEndStr);

  // Grupare pe categorie
  const byCategory: Record<string, { income: number; expense: number }> = {};
  for (const tx of categoryBreakdown || []) {
    const cat = tx.category || "alt";
    if (!byCategory[cat]) byCategory[cat] = { income: 0, expense: 0 };
    if (tx.type === "income") byCategory[cat].income += Number(tx.amount);
    else byCategory[cat].expense += Number(tx.amount);
  }

  // Cash vs card luna curenta
  const cashTotal = (categoryBreakdown || []).filter(t => t.type === "income" && t.payment_method === "cash").reduce((s, t) => s + Number(t.amount), 0);
  const cardTotal = (categoryBreakdown || []).filter(t => t.type === "income" && t.payment_method === "card").reduce((s, t) => s + Number(t.amount), 0);
  const transferTotal = (categoryBreakdown || []).filter(t => t.type === "income" && t.payment_method === "transfer").reduce((s, t) => s + Number(t.amount), 0);
  const totalIncomeMonth = cashTotal + cardTotal + transferTotal;

  const pl = (monthlyPL || []).reverse(); // crescator pentru chart

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Rapoarte P&L</h1>
        <p className="text-slate-500 text-sm mt-0.5">Profit & Loss, defalcare pe categorii și metode de plată</p>
      </div>

      {/* Cash vs Card vs Transfer */}
      <div className="bg-white rounded-xl border border-slate-100 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Luna curentă — metode de plată</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(cashTotal)}</div>
            <div className="text-xs text-slate-400 mt-1">Cash</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {totalIncomeMonth > 0 ? `${((cashTotal / totalIncomeMonth) * 100).toFixed(0)}%` : "—"}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(cardTotal)}</div>
            <div className="text-xs text-slate-400 mt-1">Card / POS</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {totalIncomeMonth > 0 ? `${((cardTotal / totalIncomeMonth) * 100).toFixed(0)}%` : "—"}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(transferTotal)}</div>
            <div className="text-xs text-slate-400 mt-1">Transfer</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {totalIncomeMonth > 0 ? `${((transferTotal / totalIncomeMonth) * 100).toFixed(0)}%` : "—"}
            </div>
          </div>
        </div>

        {/* Progress bar vizuala */}
        {totalIncomeMonth > 0 && (
          <div className="mt-4 flex rounded-full overflow-hidden h-2">
            <div className="bg-amber-400" style={{ width: `${(cashTotal / totalIncomeMonth) * 100}%` }} />
            <div className="bg-blue-400" style={{ width: `${(cardTotal / totalIncomeMonth) * 100}%` }} />
            <div className="bg-purple-400" style={{ width: `${(transferTotal / totalIncomeMonth) * 100}%` }} />
          </div>
        )}
      </div>

      {/* Chart P&L lunar */}
      <div className="bg-white rounded-xl border border-slate-100 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">P&L lunar (ultimele 12 luni)</h2>
        <PLChart data={pl} />
      </div>

      {/* Tabel P&L detaliat */}
      {monthlyPL && monthlyPL.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Detaliu lunar</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Lună</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-400">Venituri</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-400">Cheltuieli</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-400">Profit</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-400">Marjă</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {monthlyPL.map((row) => {
                const margin = row.total_income > 0
                  ? ((Number(row.profit) / Number(row.total_income)) * 100).toFixed(0)
                  : "—";
                return (
                  <tr key={row.month} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{row.month_label}</td>
                    <td className="px-5 py-3 text-right text-green-600">{formatCurrency(Number(row.total_income))}</td>
                    <td className="px-5 py-3 text-right text-red-500">{formatCurrency(Number(row.total_expense))}</td>
                    <td className={`px-5 py-3 text-right font-semibold ${Number(row.profit) >= 0 ? "text-blue-600" : "text-red-600"}`}>
                      {formatCurrency(Number(row.profit))}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-500 text-xs">
                      {margin !== "—" ? `${margin}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Defalcare categorii luna curenta */}
      {Object.keys(byCategory).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Defalcare categorii — luna curentă</h2>
          <div className="space-y-2">
            {Object.entries(byCategory)
              .sort((a, b) => (b[1].income + b[1].expense) - (a[1].income + a[1].expense))
              .map(([cat, vals]) => (
                <div key={cat} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand-400" />
                    <span className="text-sm text-slate-700 capitalize">{cat}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    {vals.income > 0 && (
                      <span className="text-sm text-green-600">+{formatCurrency(vals.income)}</span>
                    )}
                    {vals.expense > 0 && (
                      <span className="text-sm text-red-500">-{formatCurrency(vals.expense)}</span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
