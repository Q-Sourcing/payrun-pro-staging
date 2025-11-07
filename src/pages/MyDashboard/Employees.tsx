import React, { useEffect, useState } from 'react'
import { useOrg } from '@/lib/tenant/OrgContext'
import { getOrgEmployees } from '@/lib/services/OrgDataService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function EmployeesOverview() {
  const { organizationId } = useOrg()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewRow, setViewRow] = useState<any | null>(null)
  const [editRow, setEditRow] = useState<any | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [organizationId])

  async function load() {
    if (!organizationId) return
    setLoading(true)
    const { data } = await getOrgEmployees(organizationId)
    const employees = data || []

    // Build maps for company and pay group names (legacy schema support)
    const companyIds = [...new Set(employees.map((e:any) => e.company_id).filter(Boolean))]
    const payGroupIds = [...new Set(employees.map((e:any) => e.pay_group_id).filter(Boolean))]

    let companyMap = new Map<string,string>()
    if (companyIds.length) {
      const { data: companies } = await supabase.from('companies').select('id, name').in('id', companyIds as string[])
      if (companies) companies.forEach((c:any)=>companyMap.set(c.id, c.name))
    }

    let payGroupMap = new Map<string,string>()
    if (payGroupIds.length) {
      const { data: pgs } = await supabase.from('pay_groups').select('id, name').in('id', payGroupIds as string[])
      if (pgs) pgs.forEach((p:any)=>payGroupMap.set(p.id, p.name))
    }

    const enriched = employees.map((e:any)=>({
      ...e,
      _company_name: companyMap.get(e.company_id) || '-',
      _pay_group_name: payGroupMap.get(e.pay_group_id) || '-',
      _type_name: e.employee_type?.name || e.employee_type || '-',
      _full_name: [e.first_name, e.last_name].filter(Boolean).join(' '),
    }))

    setRows(enriched)
    setLoading(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    // Try legacy table first
    let res = await supabase.from('employees').delete().eq('id', id)
    if (res.error) {
      res = await supabase.from('employee_master').delete().eq('id', id)
    }
    setDeletingId(null)
    await load()
  }

  const total = rows.length
  const active = rows.filter(r => String(r.status).toLowerCase() === 'active').length

  return (
    <div className="px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Employees Overview</h1>
        <p className="text-muted-foreground text-sm">Employees in your organization</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-6">
        <MetricCard label="Total Employees" value={total} loading={loading} />
        <MetricCard label="Active" value={active} loading={loading} />
        <MetricCard label="Inactive" value={total - active} loading={loading} />
        <MetricCard label="Avg Base Rate" value={avg(rows.map(r=>Number(r.base_rate)||0)).toFixed(2)} loading={loading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th>Name</th><th>Email</th><th>Employee ID</th><th>Company</th><th>Type</th><th>Pay Group</th><th>Pay Type</th><th>Base Rate</th><th>Status</th><th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b last:border-none">
                  <td>{r._full_name || r.first_name || r.email}</td>
                  <td>{r.email}</td>
                  <td>{r.employee_number || r.id?.slice(0,8)}</td>
                  <td>{r._company_name}</td>
                  <td>{r._type_name}</td>
                  <td>{r._pay_group_name}</td>
                  <td>{fmtPayType(r.pay_type || r.pay_type_id)}</td>
                  <td>{fmtCurrency(r.base_rate || 0, r.currency)}</td>
                  <td>{r.status}</td>
                  <td className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={()=>setViewRow(r)}>View</Button>
                    <Button variant="outline" size="sm" onClick={()=>setEditRow(r)}>Edit</Button>
                    <Button variant="destructive" size="sm" disabled={deletingId===r.id} onClick={()=>handleDelete(r.id)}>{deletingId===r.id? 'Deleting…':'Delete'}</Button>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={10} className="py-3 text-muted-foreground">No employees found.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewRow} onOpenChange={(o)=>!o && setViewRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Employee Details</DialogTitle></DialogHeader>
          {viewRow && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Name" value={viewRow._full_name || viewRow.first_name} />
              <Field label="Email" value={viewRow.email} />
              <Field label="Employee ID" value={viewRow.employee_number || viewRow.id} />
              <Field label="Company" value={viewRow._company_name} />
              <Field label="Org Unit" value={viewRow.org_unit_id || '-'} />
              <Field label="Type" value={viewRow._type_name} />
              <Field label="Pay Group" value={viewRow._pay_group_name} />
              <Field label="Pay Type" value={fmtPayType(viewRow.pay_type)} />
              <Field label="Base Rate" value={fmtCurrency(viewRow.base_rate||0, viewRow.currency)} />
              <Field label="Status" value={viewRow.status} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog (minimal inline) */}
      <Dialog open={!!editRow} onOpenChange={(o)=>!o && setEditRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Employee</DialogTitle></DialogHeader>
          {editRow && (
            <div className="space-y-3 text-sm">
              <div>Name: {editRow._full_name}</div>
              <div>Status: {editRow.status}</div>
              <div className="text-muted-foreground">For full editing, use the Employees page. Basic changes coming soon.</div>
              <div className="flex justify-end"><Button onClick={()=>setEditRow(null)}>Close</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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

function avg(arr: number[]) { return arr.length ? arr.reduce((a,n)=>a+n,0)/arr.length : 0 }

function fmtPayType(v: any) {
  if (!v) return '-'
  const s = String(v)
  if (s === 'piece_rate') return 'Piece Rate'
  if (s === 'daily_rate') return 'Daily Rate'
  return s.charAt(0).toUpperCase()+s.slice(1)
}

function fmtCurrency(n: number, code?: string) {
  const c = code || 'USD'
  return (Number(n)||0).toLocaleString('en-US', { style: 'currency', currency: c })
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value || '-'}</div>
    </div>
  )
}
