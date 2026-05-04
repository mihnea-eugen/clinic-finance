import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function ClinicsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: clinics } = await supabase
    .from("clinics")
    .select("*")
    .eq("user_id", user.id)
    .order("name");

  const { data: debts } = await supabase
    .from("v_clinic_debts")
    .select("*")
    .eq("user_id", user.id);

  const { data: bills } = await supabase
    .from("clinic_bills")
    .select("*, clinics(name)")
    .eq("user_id", user.id)
    .neq("status", "paid")
    .order("due_date", { ascending: true });

  const debtMap = Object.fromEntries((debts || []).map(d => [d.clinic_id, d]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Clinici colaboratoare</h1>
          <p className="text-slate-500 text-sm mt-0.5">Ce datorăm fiecărei clinici</p>
        </div>
      </div>

      {/* Sumar datorii */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(clinics || []).map((clinic) => {
          const debt = debtMap[clinic.id];
          return (
            <div key={clinic.id} className="bg-white rounded-xl border border-slate-100 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{clinic.name}</h3>
                  {clinic.contact_name && (
                    <p className="text-xs text-slate-400 mt-0.5">{clinic.contact_name}</p>
                  )}
                </div>
                {clinic.rate_value && (
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {clinic.rate_type === "percentage" ? `${clinic.rate_value}%` : `${clinic.rate_value} RON`}
                  </span>
                )}
              </div>

              {debt ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total datorat</span>
                    <span className="font-semibold text-orange-600">{formatCurrency(Number(debt.total_remaining))}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Achitat</span>
                    <span className="text-green-600">{formatCurrency(Number(debt.total_paid))}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Fișe pendinte</span>
                    <span className="text-slate-600">{debt.pending_bills}</span>
                  </div>
                  {debt.next_due_date && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Scadență</span>
                      <span className="text-red-500 font-medium">{formatDate(debt.next_due_date)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-green-600">Nicio datorie</p>
              )}

              <div className="mt-3 pt-3 border-t border-slate-50 flex gap-2 text-xs">
                {clinic.contact_phone && (
                  <a href={`tel:${clinic.contact_phone}`} className="text-brand-600 hover:underline">
                    {clinic.contact_phone}
                  </a>
                )}
              </div>
            </div>
          );
        })}

        {(!clinics || clinics.length === 0) && (
          <div className="col-span-3 bg-white rounded-xl border border-slate-100 p-12 text-center">
            <p className="text-slate-400 text-sm">Nicio clinică adăugată.</p>
            <p className="text-slate-400 text-xs mt-1">Adaugă prima clinică colaboratoare.</p>
          </div>
        )}
      </div>

      {/* Fise neplatite */}
      {bills && bills.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Fișe neachitate</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Clinică</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Perioadă</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Scadență</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Status</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-400">Rămas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {bills.map((bill) => (
                <tr key={bill.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">{bill.clinics?.name}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs">
                    {bill.period_start ? `${formatDate(bill.period_start)} – ${formatDate(bill.period_end)}` : "—"}
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">
                    {bill.due_date ? formatDate(bill.due_date) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium
                      ${bill.status === "pending" ? "bg-yellow-50 text-yellow-700" :
                        bill.status === "partial" ? "bg-blue-50 text-blue-700" :
                        "bg-red-50 text-red-700"}`}>
                      {bill.status === "pending" ? "Nepltit" : bill.status === "partial" ? "Parțial" : "Disputat"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-orange-600">
                    {formatCurrency(Number(bill.amount_remaining))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
