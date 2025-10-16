import React from 'react';
import { SupabaseDiagnostic } from '../components/Diagnostics/SupabaseDiagnostic';

export default function Diagnostics() {
  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">🔧 System Diagnostics</h1>
          <p className="text-gray-600 mt-2">
            Diagnostic tools to verify your environment configuration and connections.
          </p>
        </div>

        <div className="grid gap-6">
          <SupabaseDiagnostic />
        </div>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-medium text-blue-800 mb-2">💡 How to Use This Diagnostic</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Green (STAGING):</strong> You're safely connected to the staging environment</li>
            <li>• <strong>Red (PRODUCTION):</strong> You're connected to live data - switch to staging immediately</li>
            <li>• <strong>Error:</strong> Connection issues - check your Lovable integration settings</li>
          </ul>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-800 mb-2">🔍 Environment Variables Check</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Current MODE:</strong> {import.meta.env.MODE || 'not set'}</p>
            <p><strong>Supabase URL:</strong> {import.meta.env.VITE_SUPABASE_URL || 'not set'}</p>
            <p><strong>API Key:</strong> {import.meta.env.VITE_SUPABASE_ANON_KEY ? 
              `${import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 20)}...` : 'not set'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
