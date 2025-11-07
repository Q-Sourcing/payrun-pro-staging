import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { OverviewPage } from '@/components/admin/OverviewPage'
import { OrganizationsList } from '@/components/admin/OrganizationsList'
import { UserManagement } from '@/components/admin/UserManagement'

export function Admin() {
  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/organizations" element={<OrganizationsList />} />
        <Route path="/organizations/:orgId" element={<div>Organization Detail - Coming Soon</div>} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/system-settings" element={<div>System Settings - Coming Soon</div>} />
        <Route path="/global-reports" element={<div>Global Reports - Coming Soon</div>} />
        <Route path="/activity-log" element={<div>Activity Log - Coming Soon</div>} />
        <Route path="/impersonation-log" element={<div>Impersonation Log - Coming Soon</div>} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminLayout>
  )
}
