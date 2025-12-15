import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useOrg } from '@/lib/tenant/OrgContext';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RefreshCcw } from 'lucide-react';
import { EmailBlockEditor, EmailDesign } from '@/components/admin/email-editor/EmailBlockEditor';

interface Template {
    id: string;
    event_key: string;
    subject_template: string;
    body_html_template: string;
    design: EmailDesign | null;
    is_active: boolean;
    org_id: string | null;
    event_description?: string;
}

interface EmailEvent {
    key: string;
    description: string;
}

export function TenantTemplateEditor() {
    const { organizationId } = useOrg();
    const { toast } = useToast();
    const [events, setEvents] = useState<EmailEvent[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<string>('');
    const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadEvents();
    }, []);

    useEffect(() => {
        if (selectedEvent && organizationId) {
            loadTemplate(selectedEvent);
        }
    }, [selectedEvent, organizationId]);

    const loadEvents = async () => {
        const { data } = await supabase.from('email_events').select('key, description');
        if (data) setEvents(data);
    };

    const loadTemplate = async (eventKey: string) => {
        setLoading(true);
        try {
            // 1. Fetch Tenant Override
            const { data: override } = await supabase
                .from('email_templates')
                .select('*')
                .eq('event_key', eventKey)
                .eq('org_id', organizationId)
                .maybeSingle();

            // 2. Fetch Default
            const { data: sysDefault } = await supabase
                .from('email_templates')
                .select('*')
                .eq('event_key', eventKey)
                .is('org_id', null)
                .single();

            const eventInfo = events.find(e => e.key === eventKey);

            if (override) {
                const t = override as any;
                setCurrentTemplate({ ...t, event_description: eventInfo?.description });
            } else if (sysDefault) {
                const def = sysDefault as any;
                setCurrentTemplate({
                    ...def,
                    id: '', // Virtual
                    org_id: null, // Is platform
                    event_description: eventInfo?.description
                });
            } else {
                setCurrentTemplate(null);
            }

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (design: EmailDesign) => {
        if (!organizationId) return;
        setSaving(true);
        try {
            const payload = {
                org_id: organizationId,
                event_key: selectedEvent,
                subject_template: design.subject,
                body_html_template: '<!-- Replaced by JSON design -->',
                design: design,
                is_active: true,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('email_templates')
                .upsert(payload, { onConflict: 'org_id,event_key' });

            if (error) throw error;

            toast({ title: 'Saved', description: 'Template override saved.' });
            loadTemplate(selectedEvent);

        } catch (error) {
            console.error(error);
            toast({ title: 'Error', variant: 'destructive', description: 'Failed to save template.' });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!organizationId || !selectedEvent) return;
        if (confirm('Are you sure you want to revert to the system default? This will delete your customizations.')) {
            await supabase
                .from('email_templates')
                .delete()
                .eq('org_id', organizationId)
                .eq('event_key', selectedEvent);

            loadTemplate(selectedEvent);
            toast({ title: 'Reverted', description: 'Restored system default.' });
        }
    };

    return (
        <Card className="min-h-[600px] flex flex-col">
            <CardHeader>
                <CardTitle>Email Templates</CardTitle>
                <CardDescription>Select an event to customize its email template.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
                <div className="flex items-center gap-4 border-b pb-4">
                    <div className="w-1/3 space-y-2">
                        <Label>Select Event</Label>
                        <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select event..." />
                            </SelectTrigger>
                            <SelectContent>
                                {events.map(e => (
                                    <SelectItem key={e.key} value={e.key}>{e.key}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {currentTemplate && (
                        <div className="flex-1 flex justify-between items-end pb-2">
                            <div className="text-sm text-muted-foreground">{currentTemplate.event_description}</div>
                            <div className="flex gap-2 items-center">
                                {currentTemplate.org_id ? (
                                    <Badge variant="outline" className="border-primary text-primary">Customized</Badge>
                                ) : (
                                    <Badge variant="secondary">System Default</Badge>
                                )}
                                <Button variant="ghost" size="sm" onClick={handleReset} disabled={!currentTemplate.org_id}>
                                    <RefreshCcw className="mr-2 h-4 w-4" /> Reset
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center">Loading...</div>
                ) : currentTemplate ? (
                    <div className="flex-1">
                        <EmailBlockEditor
                            key={currentTemplate.org_id || 'default'} // Reset state on switch
                            initialDesign={currentTemplate.design || {
                                subject: currentTemplate.subject_template,
                                blocks: []
                            }}
                            onSave={handleSave}
                            isLoading={saving}
                        />
                    </div>
                ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">Select an event to start editing</div>
                )}
            </CardContent>
        </Card>
    );
}
