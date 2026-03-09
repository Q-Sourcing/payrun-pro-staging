import React, { useEffect, useMemo, useState } from 'react'
import { useOrg } from '@/lib/tenant/OrgContext'
import { getOrgPayRuns } from '@/lib/services/OrgDataService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, DollarSign, TrendingUp, FileText, Clock } from 'lucide-react'

const PAGE_SIZE = 10

export default function PayRunsOverview() {
  const { organizationId } = useOrg()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)

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

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const paginatedRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Group totals by currency
  const currencyTotals = useMemo(() => {
    const map: Record<string, { gross: number; net: number; count: number }> = {}
    rows.forEach(r => {
      const currency = r.currency || r.pay_group?.currency || 'USD'
      if (!map[currency]) map[currency] = { gross: 0, net: 0, count: 0 }
      map[currency].gross += Number(r.total_gross) || Number(r.total_gross_pay) || 0
      map[currency].net += Number(r.total_net) || Number(r.total_net_pay) || 0
      map[currency].count += 1
    })
    return map
  }, [rows])

  const formatCurrency = (amount: number, currency: string) => {
    try {
      return amount.toLocaleString('en-US', { style: 'currency', currency })
    } catch {
      return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    }
  }

  const getStatusVariant = (status: string) => {
    const s = (status || '').toLowerCase()
    if (s.includes('completed') || s.includes('processed') || s.includes('paid')) return 'default'
    if (s.includes('approved')) return 'secondary'
    if (s.includes('pending') || s.includes('draft')) return 'outline'
    return 'outline'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Pay Runs</h1>
        <p className="text-muted-foreground text-sm mt-1">View and manage pay runs assigned to your scope</p>
      </div>

      {/* Summary Cards by Currency */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<FileText className="h-4 w-4" />}
          label="Total Runs"
          value={loading ? '—' : String(rows.length)}
          sublabel="All time"
        />
        {Object.entries(currencyTotals).map(([currency, totals]) => (
          <React.Fragment key={currency}>
            <SummaryCard
              icon={<TrendingUp className="h-4 w-4" />}
              label={`Gross (${currency})`}
              value={loading ? '—' : formatCurrency(totals.gross, currency)}
              sublabel={`${totals.count} run${totals.count !== 1 ? 's' : ''}`}
            />
            <SummaryCard
              icon={<DollarSign className="h-4 w-4" />}
              label={`Net (${currency})`}
              value={loading ? '—' : formatCurrency(totals.net, currency)}
              sublabel={`${totals.count} run${totals.count !== 1 ? 's' : ''}`}
            />
          </React.Fragment>
        ))}
      </div>

      {/* Pay Runs Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Pay Runs</CardTitle>
            <span className="text-xs text-muted-foreground">
              Showing {rows.length === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} of {rows.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Pay Period</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Pay Group</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Currency</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Gross</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-muted animate-pulse rounded w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Clock className="h-8 w-8 text-muted-foreground/50" />
                        <p className="text-muted-foreground font-medium">No pay runs found</p>
                        <p className="text-muted-foreground/70 text-xs">Pay runs assigned to you will appear here</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map(r => {
                    const currency = r.currency || r.pay_group?.currency || 'USD'
                    const status = r.payroll_status || r.status || 'Unknown'
                    return (
                      <tr key={r.id} className="border-b last:border-none hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {String(r.pay_period_start).slice(0, 10)} — {String(r.pay_period_end).slice(0, 10)}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {r.pay_group?.name || r.pay_group_name || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs font-mono">{currency}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-foreground tabular-nums">
                          {formatCurrency(Number(r.total_gross || r.total_gross_pay) || 0, currency)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-foreground tabular-nums">
                          {formatCurrency(Number(r.total_net || r.total_net_pay) || 0, currency)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={getStatusVariant(status)} className="capitalize text-xs">
                            {status}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {rows.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <Button
                    key={i}
                    variant={i === page ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setPage(i)}
                  >
                    {i + 1}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({ icon, label, value, sublabel }: { icon: React.ReactNode; label: string; value: string; sublabel: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          {icon}
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>
        <div className="text-xl font-bold text-foreground tabular-nums">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>
      </CardContent>
    </Card>
  )
}
