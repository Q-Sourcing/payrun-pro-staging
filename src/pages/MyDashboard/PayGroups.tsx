import React, { useEffect, useState } from 'react'
import { useOrg } from '@/lib/tenant/OrgContext'
import { getOrgPayGroups } from '@/lib/services/OrgDataService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PayGroupsOverview() {
  const { organizationId } = useOrg()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!organizationId) return
      setLoading(true)
      const { data } = await getOrgPayGroups(organizationId)
      setRows(data || [])
      setLoading(false)
    }
    load()
  }, [organizationId])

  return (
    <div className="px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Pay Group Overview</h1>
        <p className="text-muted-foreground text-sm">Groups available for your organization</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-6">
        <MetricCard label="Total Pay Groups" value={rows.length} loading={loading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pay Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-muted-foreground"><th>Name</th><th>Employee Type</th><th>Company Unit</th><th>Currency</th><th>Created</th></tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b last:border-none">
                  <td>{r.name}</td>
                  <td>{r.employee_type?.name || '-'}</td>
                  <td>{r.company_unit?.name || '-'}</td>
                  <td>{r.currency || '-'}</td>
                  <td>{String(r.created_at||'').slice(0,10)}</td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={5} className="py-3 text-muted-foreground">No pay groups found.</td></tr>
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
