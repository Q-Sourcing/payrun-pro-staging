import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Variable } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export interface Placeholder {
    key: string;
    label: string;
    description: string;
    category: 'organization' | 'employee' | 'payroll' | 'approval' | 'system';
    example_value: string;
}

interface PlaceholderPickerProps {
    onSelect: (placeholder: Placeholder) => void;
    trigger?: React.ReactNode;
}

export function PlaceholderPicker({ onSelect, trigger }: PlaceholderPickerProps) {
    const [open, setOpen] = useState(false);
    const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            loadPlaceholders();
        }
    }, [open]);

    const loadPlaceholders = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('email_placeholders')
            .select('*')
            .order('category')
            .order('label');

        if (data) {
            setPlaceholders(data as Placeholder[]);
        }
        setLoading(false);
    };

    const filtered = placeholders.filter(p =>
        p.label.toLowerCase().includes(search.toLowerCase()) ||
        p.key.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase())
    );

    const grouped = filtered.reduce((acc, p) => {
        if (!acc[p.category]) acc[p.category] = [];
        acc[p.category].push(p);
        return acc;
    }, {} as Record<string, Placeholder[]>);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <Variable className="h-4 w-4" />
                        Insert Variable
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Insert Variable</DialogTitle>
                </DialogHeader>

                <div className="relative mb-4">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search variables..."
                        className="pl-9"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <ScrollArea className="flex-1 pr-4">
                    {loading ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">Loading variables...</div>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(grouped).map(([category, items]) => (
                                <div key={category}>
                                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">
                                        {category}
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {items.map(p => (
                                            <button
                                                key={p.key}
                                                onClick={() => {
                                                    onSelect(p);
                                                    setOpen(false);
                                                }}
                                                className="flex flex-col items-start p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left group"
                                            >
                                                <div className="flex items-center justify-between w-full mb-1">
                                                    <span className="font-medium text-sm">{p.label}</span>
                                                    <Badge variant="secondary" className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                                                        Insert
                                                    </Badge>
                                                </div>
                                                <code className="text-[10px] bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-slate-500 font-mono mb-1">
                                                    {`{{${p.key}}}`}
                                                </code>
                                                <span className="text-xs text-muted-foreground line-clamp-1">
                                                    Ex: {p.example_value}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {filtered.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    No variables found matching "{search}"
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
