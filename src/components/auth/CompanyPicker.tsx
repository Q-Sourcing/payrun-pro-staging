import { useEffect, useState } from 'react';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

type Company = { id: string; name: string };

export default function CompanyPicker() {
  const { user } = useSupabaseAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (!user?.id) return;
        const { data, error } = await supabase
          .from('user_company_memberships')
          .select('company:companies(id, name)')
          .eq('user_id', user.id);
        if (error) throw error;
        const mapped = (data || [])
          .map((r: any) => r.company)
          .filter(Boolean)
          .sort((a: Company, b: Company) => a.name.localeCompare(b.name));
        if (!cancelled) setCompanies(mapped);

        // Auto-select if only one
        if (mapped.length === 1) {
          const id = mapped[0].id;
          localStorage.setItem('active_company_id', id);
          navigate('/dashboard', { replace: true });
        }
      } catch (e) {
        if (!cancelled) setCompanies([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, navigate]);

  const choose = (id: string) => {
    localStorage.setItem('active_company_id', id);
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-lg">Select your company</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading companies…</div>
          ) : companies.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No company memberships found for your account. Please contact an administrator.
            </div>
          ) : (
            <div className="space-y-2">
              {companies.map((c) => (
                <div key={c.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                  <div className="text-sm font-medium">{c.name}</div>
                  <Button size="sm" onClick={() => choose(c.id)}>Use</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


