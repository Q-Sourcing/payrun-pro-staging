import React, { useEffect, useMemo, useState } from 'react'
import { useOrg } from '@/lib/tenant/OrgContext'
import { getOrgPayRuns } from '@/lib/services/OrgDataService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PayRunsOverview() {
  const { organizationId } = useOrg()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!organizationId) return
      setLoading(true)
      const { data } = await getOrgPayRuns(organizationId)
      setRows(data || [])
      setLoading(false)
    }
    load()
  }, [organizationId])

  const totals = useMemo(() => ({
    gross: rows.reduce((a, r) => a + (Number(r.total_gross)||Number(r.total_gross_pay)||0), 0),
    net: rows.reduce((a, r) => a + (Number(r.total_net)||Number(r.total_net_pay)||0), 0),
  }), [rows])

  return (
    <div className="px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Pay Run Overview</h1>
        <p className="text-muted-foreground text-sm">Recent payroll runs</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-6">
        <MetricCard label="Runs" value={rows.length} loading={loading} />
        <MetricCard label="Total Gross" value={fmt(totals.gross)} loading={loading} />
        <MetricCard label="Total Net" value={fmt(totals.net)} loading={loading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pay Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-muted-foreground"><th>Pay Period</th><th>Pay Group</th><th>Gross</th><th>Net</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b last:border-none">
                  <td>{String(r.pay_period_start).slice(0,10)} - {String(r.pay_period_end).slice(0,10)}</td>
                  <td>{r.pay_group?.name || r.pay_group_name || '-'}</td>
                  <td>{fmt(r.total_gross || r.total_gross_pay)}</td>
                  <td>{fmt(r.total_net || r.total_net_pay)}</td>
                  <td>{r.payroll_status || r.status}</td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={5} className="py-3 text-muted-foreground">No pay runs found.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({ label, value, loading }: { label: string; value: any; loading: boolean }) {
  return (
    <Card className="flex flex-col items-center justify-center py-6">
      <CardHeader className="pb-2 text-center"><CardTitle className="text-sm">{label}</CardTitle></CardHeader>
      <CardContent className="text-xl font-semibold">{loading ? '—' : value}</CardContent>
    </Card>
  )
}

function fmt(n: any) { const v = Number(n)||0; return v.toLocaleString('en-US', { style:'currency', currency:'USD' }) }
