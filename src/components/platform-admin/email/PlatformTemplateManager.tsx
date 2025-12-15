import { EmailBlockEditor, EmailDesign } from '@/components/admin/email-editor/EmailBlockEditor';

// ... (keep headers)

interface EmailTemplate {
    id: string;
    event_key: string;
    subject_template: string;
    body_html_template: string;
    design: EmailDesign | null; // JSONB
    is_active: boolean;
    event: {
        description: string;
    };
}

export function PlatformTemplateManager() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

    // ... (loadTemplates logic remains mostly the same, ensuring design col is fetched)

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('email_templates')
                .select(`*, event:email_events(description)`)
                .is('org_id', null)
                .order('event_key');

            if (error) throw error;
            setTemplates(data || []);
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', variant: 'destructive', description: 'Failed to load templates' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (design: EmailDesign) => {
        if (!editingTemplate) return;
        try {
            const { error } = await supabase
                .from('email_templates')
                .update({
                    subject_template: design.subject,
                    body_html_template: '<!-- Replaced by JSON design -->', // Legacy fallback or keep generated HTML if we implement server-side generation here too
                    design: design,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingTemplate.id);

            if (error) throw error;

            toast({ title: 'Success', description: 'Template updated' });
            setEditingTemplate(null);
            loadTemplates();
        } catch (error) {
            console.error('Error saving:', error);
            toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>System Default Templates</CardTitle>
                    <CardDescription>Manage default templates using the Block Editor.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? <div>Loading...</div> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Event</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {templates.map(tpl => (
                                    <TableRow key={tpl.id}>
                                        <TableCell>
                                            <div className="font-medium">{tpl.event_key}</div>
                                            <div className="text-xs text-muted-foreground">{tpl.event?.description}</div>
                                        </TableCell>
                                        <TableCell>{tpl.subject_template}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => setEditingTemplate(tpl)}>
                                                <Edit2 className="h-4 w-4 mr-2" /> Edit
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-6">
                    <DialogHeader>
                        <DialogTitle>Edit Template: {editingTemplate?.event_key}</DialogTitle>
                        <DialogDescription>Use the block editor to design the email.</DialogDescription>
                    </DialogHeader>

                    {editingTemplate && (
                        <div className="flex-1 overflow-hidden">
                            <EmailBlockEditor
                                initialDesign={editingTemplate.design || {
                                    subject: editingTemplate.subject_template,
                                    blocks: []
                                }}
                                onSave={handleSave}
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
