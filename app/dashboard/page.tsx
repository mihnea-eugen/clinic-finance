import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import CashFlowChart from "@/components/dashboard/cash-flow-chart";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

async function getDashboardData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const today = format(new Date(), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");
  const last30 = format(subDays(new Date(), 29), "yyyy-MM-dd");

  // Azi
  const { data: todayTx } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today);

  // Luna curenta
  const { data: monthTx } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", monthStart)
    .lte("date", monthEnd);

  // Cash flow ultimele 30 zile (pentru chart)
  const { data: chartData } = await supabase
    .from("v_daily_cashflow")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", last30)
    .order("date");

  // Datorii clinici
  const { data: clinicDebts } = await supabase
    .from("v_clinic_debts")
    .select("*")
    .eq("user_id", user.id);

  // Facturi neplatite
  const { data: unpaidInvoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["unpaid", "partial", "overdue"]);

  // Ultimele 10 tranzactii
  const { data: recentTx } = await supabase
    .from("transactions")
    .select("*, clinics(name)")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(10);

  // Calcule azi
  const todayIncome = (todayTx || []).filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const todayCash = (todayTx || []).filter(t => t.type === "income" && t.payment_method === "cash").reduce((s, t) => s + Number(t.amount), 0);
  const todayCard = (todayTx || []).filter(t => t.type === "income" && t.payment_method === "card").reduce((s, t) => s + Number(t.amount), 0);
  const todayExpense = (todayTx || []).filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  // Calcule luna
  const monthIncome = (monthTx || []).filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const monthExpense = (monthTx || []).filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const monthCash = (monthTx || []).filter(t => t.type === "income" && t.payment_method === "cash").reduce((s, t) => s + Number(t.amount), 0);
  const monthCard = (monthTx || []).filter(t => t.type === "income" && t.payment_method === "card").reduce((s, t) => s + Number(t.amount), 0);

  // Datorii totale clinici
  const totalClinicDebt = (clinicDebts || []).reduce((s, d) => s + Number(d.total_remaining), 0);

  // Facturi neplatite total
  const totalUnpaidInvoices = (unpaidInvoices || []).reduce((s, i) => s + (Number(i.total_amount) - Number(i.amount_paid)), 0);

  return {
    today: { income: todayIncome, cash: todayCash, card: todayCard, expense: todayExpense },
    month: { income: monthIncome, expense: monthExpense, profit: monthIncome - monthExpense, cash: monthCash, card: monthCard },
    totalClinicDebt,
    totalUnpaidInvoices,
    clinicDebts: clinicDebts || [],
    chartData: chartData || [],
    recentTx: recentTx || [],
    todayStr: today,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  if (!data) return null;

  const { today, month, totalClinicDebt, totalUnpaidInvoices, clinicDebts, chartData, recentTx, todayStr } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Overview</h1>
        <p className="text-slate-500 text-sm mt-0.5">{formatDate(todayStr, "EEEE, d MMMM yyyy")}</p>
      </div>

      {/* Stats azi */}
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Astăzi</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total încasat" value={formatCurrency(today.income)} color="green" sub={`Cash: ${formatCurrency(today.cash)} · Card: ${formatCurrency(today.card)}`} />
          <StatCard label="Total cheltuieli" value={formatCurrency(today.expense)} color="red" />
          <StatCard label="Net azi" value={formatCurrency(today.income - today.expense)} color={today.income - today.expense >= 0 ? "blue" : "red"} />
          <StatCard label="Datorii clinici" value={formatCurrency(totalClinicDebt)} color="orange" sub={`${clinicDebts.length} clinici`} />
        </div>
      </div>

      {/* Stats luna */}
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Luna curentă</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Venituri" value={formatCurrency(month.income)} color="green" sub={`Cash: ${formatCurrency(month.cash)} · Card: ${formatCurrency(month.card)}`} />
          <StatCard label="Cheltuieli" value={formatCurrency(month.expense)} color="red" />
          <StatCard label="Profit" value={formatCurrency(month.profit)} color={month.profit >= 0 ? "blue" : "red"} />
          <StatCard label="Facturi neîncasate" value={formatCurrency(totalUnpaidInvoices)} color="orange" />
        </div>
      </div>

      {/* Chart + Clinici */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash flow chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Cash flow ultimele 30 zile</h2>
          <CashFlowChart data={chartData} />
        </div>

        {/* Datorii clinici */}
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Datorii clinici</h2>
          {clinicDebts.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Nicio datorie</p>
          ) : (
            <div className="space-y-3">
              {clinicDebts.map((d: {clinic_id: string; clinic_name: string; total_remaining: number; pending_bills: number}) => (
                <div key={d.clinic_id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{d.clinic_name}</p>
                    <p className="text-xs text-slate-400">{d.pending_bills} fișe pendinte</p>
                  </div>
                  <p className="text-sm font-semibold text-orange-600">{formatCurrency(Number(d.total_remaining))}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tranzactii recente */}
      <div className="bg-white rounded-xl border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700">Tranzacții recente</h2>
          <a href="/dashboard/transactions" className="text-xs text-brand-600 hover:underline">Vezi toate</a>
        </div>
        {recentTx.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Nicio tranzacție. Încarcă primul document.</p>
        ) : (
          <div className="space-y-2">
            {recentTx.map((tx: {id: string; date: string; description?: string; amount: number; type: string; payment_method?: string; clinics?: {name: string}}) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${tx.type === "income" ? "bg-green-400" : "bg-red-400"}`} />
                  <div>
                    <p className="text-sm text-slate-800">{tx.description || "Fără descriere"}</p>
                    <p className="text-xs text-slate-400">
                      {formatDate(tx.date)} · {tx.payment_method === "cash" ? "Cash" : tx.payment_method === "card" ? "Card" : "Transfer"}
                      {tx.clinics?.name && ` · ${tx.clinics.name}`}
                    </p>
                  </div>
                </div>
                <p className={`text-sm font-semibold ${tx.type === "income" ? "text-green-600" : "text-red-500"}`}>
                  {tx.type === "income" ? "+" : "-"}{formatCurrency(Number(tx.amount))}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, sub }: { label: string; value: string; color: "green" | "red" | "blue" | "orange"; sub?: string }) {
  const colors = {
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700",
    orange: "bg-orange-50 text-orange-700",
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${colors[color].split(" ")[1]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}
