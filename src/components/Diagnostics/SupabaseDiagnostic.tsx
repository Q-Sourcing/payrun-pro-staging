import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { checkSupabaseEnvironment } from '../../utils/checkSupabaseEnv';

interface DiagnosticResult {
  status: 'checking' | 'success' | 'warning' | 'error';
  message: string;
  projectRef?: string;
  environment?: 'staging' | 'production' | 'unknown';
  details?: string[];
}

export function SupabaseDiagnostic() {
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostic = async () => {
    setIsRunning(true);
    setResult({ status: 'checking', message: 'Running diagnostic...' });

    try {
      // Capture console output
      const originalLog = console.log;
      const originalWarn = console.warn;
      const originalError = console.error;
      
      let capturedMessages: string[] = [];
      
      console.log = (...args) => {
        capturedMessages.push(args.join(' '));
        originalLog(...args);
      };
      
      console.warn = (...args) => {
        capturedMessages.push(`WARNING: ${args.join(' ')}`);
        originalWarn(...args);
      };
      
      console.error = (...args) => {
        capturedMessages.push(`ERROR: ${args.join(' ')}`);
        originalError(...args);
      };

      await checkSupabaseEnvironment();

      // Restore console
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;

      // Parse results from captured messages
      const successMessage = capturedMessages.find(msg => msg.includes('✅ Connected to Supabase (STAGING)'));
      const warningMessage = capturedMessages.find(msg => msg.includes('⚠️ Warning: Connected to PRODUCTION'));
      const errorMessage = capturedMessages.find(msg => msg.includes('❌ Connection failed'));

      if (successMessage) {
        const projectRef = capturedMessages.find(msg => msg.includes('Project ref:'))?.split('Project ref: ')[1];
        setResult({
          status: 'success',
          message: 'Connected to Supabase (STAGING)',
          projectRef,
          environment: 'staging',
          details: capturedMessages.filter(msg => !msg.includes('🔍') && !msg.includes('✅'))
        });
      } else if (warningMessage) {
        const projectRef = capturedMessages.find(msg => msg.includes('Project ref:'))?.split('Project ref: ')[1];
        setResult({
          status: 'warning',
          message: 'Connected to PRODUCTION - Switch to staging!',
          projectRef,
          environment: 'production',
          details: capturedMessages.filter(msg => !msg.includes('🔍') && !msg.includes('⚠️'))
        });
      } else if (errorMessage) {
        setResult({
          status: 'error',
          message: 'Connection failed',
          details: capturedMessages.filter(msg => !msg.includes('🔍') && !msg.includes('❌'))
        });
      } else {
        setResult({
          status: 'error',
          message: 'Unknown error occurred',
          details: capturedMessages
        });
      }
    } catch (error) {
      setResult({
        status: 'error',
        message: 'Diagnostic failed',
        details: [error instanceof Error ? error.message : 'Unknown error']
      });
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    // Auto-run diagnostic on component mount in development
    if (process.env.NODE_ENV === 'development') {
      runDiagnostic();
    }
  }, []);

  const getStatusIcon = () => {
    switch (result?.status) {
      case 'checking':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = () => {
    switch (result?.status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">STAGING</Badge>;
      case 'warning':
        return <Badge variant="destructive">PRODUCTION</Badge>;
      case 'error':
        return <Badge variant="secondary">ERROR</Badge>;
      default:
        return <Badge variant="outline">UNKNOWN</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Supabase Environment Diagnostic
        </CardTitle>
        <CardDescription>
          Verify you're connected to the correct Supabase environment (staging vs production)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Status:</span>
            {getStatusBadge()}
            {result?.projectRef && (
              <Badge variant="outline">Ref: {result.projectRef}</Badge>
            )}
          </div>
          <Button 
            onClick={runDiagnostic} 
            disabled={isRunning}
            variant="outline"
            size="sm"
          >
            {isRunning ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Run Diagnostic
              </>
            )}
          </Button>
        </div>

        {result && (
          <div className="space-y-3">
            <div className={`p-3 rounded-lg border ${
              result.status === 'success' ? 'bg-green-50 border-green-200' :
              result.status === 'warning' ? 'bg-yellow-50 border-yellow-200' :
              result.status === 'error' ? 'bg-red-50 border-red-200' :
              'bg-gray-50 border-gray-200'
            }`}>
              <p className={`font-medium ${
                result.status === 'success' ? 'text-green-800' :
                result.status === 'warning' ? 'text-yellow-800' :
                result.status === 'error' ? 'text-red-800' :
                'text-gray-800'
              }`}>
                {result.message}
              </p>
            </div>

            {result.details && result.details.length > 0 && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-medium mb-2">Details:</h4>
                <ul className="text-sm space-y-1">
                  {result.details.map((detail, index) => (
                    <li key={index} className="text-gray-600">
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.status === 'warning' && (
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-800 mb-2">⚠️ Action Required:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• You are connected to the LIVE production database</li>
                  <li>• Switch to staging in Lovable → Integrations → Supabase</li>
                  <li>• Or update your environment variables to point to staging</li>
                </ul>
              </div>
            )}

            {result.status === 'error' && (
              <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                <h4 className="font-medium text-red-800 mb-2">❌ Troubleshooting:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• Check your Lovable → Integrations → Supabase connection</li>
                  <li>• Verify environment variables are set correctly</li>
                  <li>• Ensure Supabase project is active and accessible</li>
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-gray-500 pt-2 border-t">
          <p><strong>Environment Detection Logic:</strong></p>
          <p>• Staging: sbphmrjoappwlervnbtm</p>
          <p>• Production: kctwfgbjmhnfqtxhagib</p>
          <p>• Project ref extracted from Supabase URL (first segment after https://)</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default SupabaseDiagnostic;
