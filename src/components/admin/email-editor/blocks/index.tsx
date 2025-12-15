import React from 'react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PlaceholderPicker, Placeholder } from '../PlaceholderPicker';
import { Button } from "@/components/ui/button";
import { Trash2, GripVertical } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

// --- Types ---

export type BlockType = 'heading' | 'paragraph' | 'button' | 'divider';

export interface BaseBlock {
    id: string;
    type: BlockType;
}

export interface HeadingBlockData extends BaseBlock {
    type: 'heading';
    text: string;
    level: 1 | 2 | 3;
}

export interface ParagraphBlockData extends BaseBlock {
    type: 'paragraph';
    text: string; // Stored as string with {{placeholders}} for simplicity in V1
}

export interface ButtonBlockData extends BaseBlock {
    type: 'button';
    label: string;
    url: string;
    align: 'left' | 'center' | 'right';
}

export interface DividerBlockData extends BaseBlock {
    type: 'divider';
}

export type EmailBlock = HeadingBlockData | ParagraphBlockData | ButtonBlockData | DividerBlockData;

// --- Props ---

interface BlockProps<T extends EmailBlock> {
    data: T;
    onChange: (data: T) => void;
    onRemove: () => void;
}

// --- Components ---

export function HeadingBlock({ data, onChange, onRemove }: BlockProps<HeadingBlockData>) {
    return (
        <BlockWrapper title="Heading" onRemove={onRemove}>
            <div className="space-y-2">
                <Input
                    value={data.text}
                    onChange={e => onChange({ ...data, text: e.target.value })}
                    placeholder="Enter heading text"
                    className="font-bold text-lg"
                />
                <div className="flex gap-2 text-xs">
                    <span
                        className={`cursor-pointer px-2 py-1 rounded border ${data.level === 1 ? 'bg-slate-100 dark:bg-slate-800 border-slate-400' : 'border-slate-200'}`}
                        onClick={() => onChange({ ...data, level: 1 })}
                    >H1</span>
                    <span
                        className={`cursor-pointer px-2 py-1 rounded border ${data.level === 2 ? 'bg-slate-100 dark:bg-slate-800 border-slate-400' : 'border-slate-200'}`}
                        onClick={() => onChange({ ...data, level: 2 })}
                    >H2</span>
                    <span
                        className={`cursor-pointer px-2 py-1 rounded border ${data.level === 3 ? 'bg-slate-100 dark:bg-slate-800 border-slate-400' : 'border-slate-200'}`}
                        onClick={() => onChange({ ...data, level: 3 })}
                    >H3</span>
                </div>
            </div>
        </BlockWrapper>
    );
}

export function ParagraphBlock({ data, onChange, onRemove }: BlockProps<ParagraphBlockData>) {
    const insertPlaceholder = (p: Placeholder) => {
        // Simple append for V1 prototype. Ideal: Insert at cursor position.
        onChange({ ...data, text: data.text + ` {{${p.key}}} ` });
    };

    return (
        <BlockWrapper title="Text Block" onRemove={onRemove}>
            <div className="space-y-2">
                <div className="flex justify-end">
                    <PlaceholderPicker onSelect={insertPlaceholder} />
                </div>
                <Textarea
                    value={data.text}
                    onChange={e => onChange({ ...data, text: e.target.value })}
                    placeholder="Enter content..."
                    rows={4}
                />
                <p className="text-xs text-muted-foreground">
                    Supports simple text and placeholders.
                </p>
            </div>
        </BlockWrapper>
    );
}

export function ButtonBlock({ data, onChange, onRemove }: BlockProps<ButtonBlockData>) {
    return (
        <BlockWrapper title="Call to Action Button" onRemove={onRemove}>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Button Label</Label>
                    <Input
                        value={data.label}
                        onChange={e => onChange({ ...data, label: e.target.value })}
                        placeholder="e.g. View Payrun"
                    />
                </div>
                <div className="space-y-2">
                    <Label>URL</Label>
                    <div className="flex gap-2">
                        <Input
                            value={data.url}
                            onChange={e => onChange({ ...data, url: e.target.value })}
                            placeholder="https://..."
                        />
                        <PlaceholderPicker
                            onSelect={p => onChange({ ...data, url: `{{${p.key}}}` })}
                            trigger={<Button variant="outline" size="icon" className="shrink-0"><span className="text-xs">var</span></Button>}
                        />
                    </div>
                </div>
                <div className="col-span-2">
                    <Label>Alignment</Label>
                    <div className="flex gap-2 mt-1">
                        {(['left', 'center', 'right'] as const).map(align => (
                            <Button
                                key={align}
                                variant={data.align === align ? "default" : "outline"}
                                size="sm"
                                onClick={() => onChange({ ...data, align })}
                                className="capitalize"
                            >
                                {align}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
        </BlockWrapper>
    );
}

export function DividerBlock({ onRemove }: Omit<BlockProps<DividerBlockData>, 'data' | 'onChange'>) {
    return (
        <BlockWrapper title="Divider" onRemove={onRemove}>
            <div className="h-4 border-b border-slate-200 dark:border-slate-700 w-full"></div>
        </BlockWrapper>
    );
}

// --- Wrapper ---

function BlockWrapper({ title, children, onRemove }: { title: string, children: React.ReactNode, onRemove: () => void }) {
    return (
        <div className="relative group bg-white dark:bg-slate-900 border rounded-lg shadow-sm hover:border-slate-400 transition-colors">
            <div className="flex items-center justify-between p-3 border-b bg-slate-50 dark:bg-slate-800/50 rounded-t-lg">
                <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-slate-400 cursor-move" />
                    <span className="text-xs font-medium uppercase tracking-wider text-slate-500">{title}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-500" onClick={onRemove}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
            <div className="p-4">
                {children}
            </div>
        </div>
    );
}
