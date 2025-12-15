import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrg } from '@/lib/tenant/OrgContext';
import { Save, Loader2, Send } from 'lucide-react';

interface TenantEmailSettings {
    org_id: string;
    emails_enabled: boolean;
    use_custom_sender: boolean;
    custom_from_name?: string;
    custom_from_email?: string;
    custom_reply_to?: string;
}

export function TenantEmailPreferences() {
    const { organizationId } = useOrg();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<TenantEmailSettings | null>(null);
    const [testEmail, setTestEmail] = useState('');
    const [sendingTest, setSendingTest] = useState(false);

    useEffect(() => {
        if (organizationId) loadSettings();
    }, [organizationId]);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('tenant_email_settings')
                .select('*')
                .eq('org_id', organizationId)
                .maybeSingle();

            if (data) {
                setSettings(data);
            } else {
                setSettings({
                    org_id: organizationId!,
                    emails_enabled: true,
                    use_custom_sender: false
                });
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const [orgName, setOrgName] = useState('');

    useEffect(() => {
        if (organizationId) {
            supabase.from('organizations').select('name').eq('id', organizationId).single()
                .then(({ data }: { data: { name: string } | null }) => { if (data) setOrgName(data.name); });
        }
    }, [organizationId]);

    const handleSave = async () => {
        if (!settings || !organizationId) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('tenant_email_settings')
                .upsert({
                    org_id: organizationId,
                    emails_enabled: settings.emails_enabled,
                    use_custom_sender: settings.use_custom_sender,
                    custom_from_name: settings.custom_from_name,
                    custom_from_email: settings.custom_from_email,
                    custom_reply_to: settings.custom_reply_to,
                    updated_at: new Date().toISOString()
                } as any);

            if (error) throw error;
            toast({ title: 'Success', description: 'Email preferences saved.' });
        } catch (error) {
            console.error('Error saving:', error);
            toast({ title: 'Error', description: 'Failed to save preferences.', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const handleSendTest = async () => {
        if (!testEmail) return toast({ title: 'Required', description: 'Enter an email address', variant: 'destructive' });
        setSendingTest(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No session');

            // Queue a test email? No, trigger-email or queue-email directly?
            // Use send-test-email but strictly validation might fail if checking admin.
            // But we are org admin.

            // Actually, best to queue a real email event 'TEST_EVENT' or similar?
            // Or just use the test endpoint.

            // Ensure Org Name is resolved
            let subjectOrgName = orgName;
            if (!subjectOrgName && organizationId) {
                const { data } = await supabase.from('organizations').select('name').eq('id', organizationId).single();
                const typedData = data as { name: string } | null;
                if (typedData) {
                    subjectOrgName = typedData.name;
                    setOrgName(typedData.name); // Cache it
                }
            }

            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-test-email`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to_email: testEmail,
                    subject: `[Test] Email from ${subjectOrgName || 'Unknown Organization'}`,
                    body_html: '<p>This is a test email from your Organization Email Settings.</p>'
                })
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('Send Email Error:', errorData);
                throw new Error(errorData || 'Failed to send');
            }

            toast({ title: 'Sent', description: 'Test email dispatched.' });

        } catch (error) {
            toast({ title: 'Error', description: 'Could not send test email.', variant: 'destructive' });
        } finally {
            setSendingTest(false);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!settings) return <div>Error loading settings</div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Email Preferences</CardTitle>
                <CardDescription>Control how emails are sent from your organization.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between border p-4 rounded bg-muted/20">
                    <div className="space-y-0.5">
                        <Label>Enable Automated Emails</Label>
                        <div className="text-sm text-muted-foreground">
                            When disabled, no business emails (approvals, payslips) will be sent.
                        </div>
                    </div>
                    <Switch
                        checked={settings.emails_enabled}
                        onCheckedChange={(c) => setSettings({ ...settings, emails_enabled: c })}
                    />
                </div>

                {/* Custom Sender - Usually requires domain verification on platform level, 
                    so for MVP Phase 4, we might disable inputs or warn user. */}
                <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="custom-sender"
                            checked={settings.use_custom_sender}
                            onCheckedChange={(c) => setSettings({ ...settings, use_custom_sender: c })}
                        />
                        <Label htmlFor="custom-sender">Use Custom Sender Identity</Label>
                    </div>

                    {settings.use_custom_sender && (
                        <div className="grid grid-cols-2 gap-4 pl-6 border-l-2">
                            <div className="space-y-2">
                                <Label>Sender Name</Label>
                                <Input
                                    value={settings.custom_from_name || ''}
                                    onChange={(e) => setSettings({ ...settings, custom_from_name: e.target.value })}
                                    placeholder="e.g. Acme HR"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Sender Email</Label>
                                <Input
                                    value={settings.custom_from_email || ''}
                                    onChange={(e) => setSettings({ ...settings, custom_from_email: e.target.value })}
                                    placeholder="e.g. payroll@acme.com"
                                />
                                <p className="text-xs text-muted-foreground">Note: Domain must be verified by platform admin.</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Reply-To Email</Label>
                                <Input
                                    value={settings.custom_reply_to || ''}
                                    onChange={(e) => setSettings({ ...settings, custom_reply_to: e.target.value })}
                                    placeholder="e.g. support@acme.com"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t bg-muted/50 p-4">
                <div className="flex gap-2">
                    <Input
                        className="w-64 bg-background"
                        placeholder="Test email address"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                    />
                    <Button variant="secondary" onClick={handleSendTest} disabled={sendingTest}>
                        {sendingTest ? <Loader2 className="animate-spin h-4 w-4" /> : <Send className="h-4 w-4" />}
                    </Button>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                    Save Preferences
                </Button>
            </CardFooter>
        </Card>
    );
}
