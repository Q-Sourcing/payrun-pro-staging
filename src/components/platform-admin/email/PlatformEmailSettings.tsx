import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Save, RefreshCw, Send } from 'lucide-react';

interface PlatformEmailSettings {
    id: string;
    is_active: boolean;
    provider_name: string;
    default_from_name: string;
    default_from_email: string;
    default_reply_to: string | null;
    enforce_identity: boolean;
    rate_limit_per_tenant: number;
}

export function PlatformEmailSettings() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<PlatformEmailSettings | null>(null);
    const [testEmail, setTestEmail] = useState('');
    const [sendingTest, setSendingTest] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('platform_email_settings')
                .select('*')
                .single();

            if (error) throw error;
            setSettings(data);
        } catch (error) {
            console.error('Error loading settings:', error);
            toast({
                title: 'Error',
                description: 'Failed to load email settings',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('platform_email_settings')
                .update({
                    is_active: settings.is_active,
                    default_from_name: settings.default_from_name,
                    default_from_email: settings.default_from_email,
                    default_reply_to: settings.default_reply_to,
                    enforce_identity: settings.enforce_identity,
                    rate_limit_per_tenant: settings.rate_limit_per_tenant
                })
                .eq('id', settings.id);

            if (error) throw error;

            toast({
                title: 'Settings Saved',
                description: 'Global email settings have been updated.',
            });
        } catch (error) {
            console.error('Error saving settings:', error);
            toast({
                title: 'Error',
                description: 'Failed to save settings',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleSendTest = async () => {
        if (!testEmail) {
            toast({ title: 'Validation Error', description: 'Please enter a recipient email', variant: 'destructive' });
            return;
        }
        setSendingTest(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No session');

            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-test-email`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to_email: testEmail,
                    subject: 'Platform Test Email',
                    body_html: '<p>This is a test email sent from the Platform Admin Console.</p>'
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to send');

            toast({ title: 'Success', description: 'Test email sent successfully' });

        } catch (error: any) {
            console.error('Test email failed:', error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setSendingTest(false);
        }
    };

    if (loading) {
        return <div className="text-center py-8">Loading settings...</div>;
    }

    if (!settings) {
        return <div className="text-center py-8">No settings found. Please initialize the database.</div>;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Global Email Configuration</CardTitle>
                    <CardDescription>Configure the default sender identity and provider settings for all tenants.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">

                    <div className="flex items-center justify-between border p-4 rounded-lg">
                        <div className="space-y-0.5">
                            <Label className="text-base">System Email Active</Label>
                            <div className="text-sm text-muted-foreground">
                                Master switch to enable/disable all system emails
                            </div>
                        </div>
                        <Switch
                            checked={settings.is_active}
                            onCheckedChange={(checked) => setSettings({ ...settings, is_active: checked })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Default Sender Name</Label>
                            <Input
                                value={settings.default_from_name}
                                onChange={(e) => setSettings({ ...settings, default_from_name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Default Sender Email</Label>
                            <Input
                                value={settings.default_from_email}
                                onChange={(e) => setSettings({ ...settings, default_from_email: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">Must be a verified domain in Resend.</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Reply-To Email (Optional)</Label>
                        <Input
                            value={settings.default_reply_to || ''}
                            onChange={(e) => setSettings({ ...settings, default_reply_to: e.target.value })}
                            placeholder="support@domain.com"
                        />
                    </div>

                    <div className="flex items-center space-x-2 mt-4">
                        <Switch
                            id="enforce"
                            checked={settings.enforce_identity}
                            onCheckedChange={(checked) => setSettings({ ...settings, enforce_identity: checked })}
                        />
                        <Label htmlFor="enforce">Enforce Sender Identity</Label>
                    </div>
                    <p className="text-xs text-muted-foreground ml-12">
                        If enabled, tenants cannot override the "From" address, only the "Reply-To".
                    </p>

                    <div className="space-y-2 mt-4 max-w-xs">
                        <Label>Rate Limit (Emails/Day per Tenant)</Label>
                        <Input
                            type="number"
                            value={settings.rate_limit_per_tenant}
                            onChange={(e) => setSettings({ ...settings, rate_limit_per_tenant: parseInt(e.target.value) })}
                        />
                    </div>

                </CardContent>
                <CardFooter className="flex justify-between border-t bg-muted/50 px-6 py-4">
                    <div className="flex space-x-2 w-full max-w-sm">
                        <Input
                            placeholder="Test recipient email"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                        />
                        <Button variant="outline" onClick={handleSendTest} disabled={sendingTest}>
                            {sendingTest ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Test
                        </Button>
                    </div>

                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
