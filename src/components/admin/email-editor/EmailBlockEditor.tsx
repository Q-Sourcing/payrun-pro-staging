import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Plus, Save, LayoutTemplate,
    Heading as HeadingIcon, Type, MousePointerClick, Minus
} from 'lucide-react';
import { PlaceholderPicker, Placeholder } from './PlaceholderPicker';
import {
    EmailBlock, BlockType, HeadingBlock, ParagraphBlock,
    ButtonBlock, DividerBlock
} from './blocks';
import { useToast } from "@/hooks/use-toast";

// --- Types ---

export interface EmailDesign {
    subject: string;
    blocks: EmailBlock[];
}

interface EmailBlockEditorProps {
    initialDesign?: EmailDesign;
    onSave: (design: EmailDesign) => Promise<void>;
    isLoading?: boolean;
}

// --- Main Component ---

export function EmailBlockEditor({ initialDesign, onSave, isLoading }: EmailBlockEditorProps) {
    const { toast } = useToast();
    const [design, setDesign] = useState<EmailDesign>({
        subject: '',
        blocks: []
    });

    useEffect(() => {
        if (initialDesign) {
            // Ensure we have valid blocks array even if DB has null/migration issues
            setDesign({
                subject: initialDesign.subject || '',
                blocks: Array.isArray(initialDesign.blocks) ? initialDesign.blocks : []
            });
        }
    }, [initialDesign]);

    // --- Handlers ---

    const addBlock = (type: BlockType) => {
        const newId = crypto.randomUUID();
        let newBlock: EmailBlock;

        switch (type) {
            case 'heading':
                newBlock = { id: newId, type: 'heading', text: 'New Heading', level: 2 };
                break;
            case 'paragraph':
                newBlock = { id: newId, type: 'paragraph', text: '' };
                break;
            case 'button':
                newBlock = { id: newId, type: 'button', label: 'Click Me', url: '#', align: 'center' };
                break;
            case 'divider':
                newBlock = { id: newId, type: 'divider' };
                break;
        }

        setDesign(prev => ({
            ...prev,
            blocks: [...prev.blocks, newBlock]
        }));
    };

    const updateBlock = (id: string, newData: EmailBlock) => {
        setDesign(prev => ({
            ...prev,
            blocks: prev.blocks.map(b => b.id === id ? newData : b)
        }));
    };

    const removeBlock = (id: string) => {
        setDesign(prev => ({
            ...prev,
            blocks: prev.blocks.filter(b => b.id !== id)
        }));
    };

    const handleSubjectChange = (val: string) => {
        setDesign(prev => ({ ...prev, subject: val }));
    };

    const insertSubjectPlaceholder = (p: Placeholder) => {
        setDesign(prev => ({ ...prev, subject: prev.subject + ` {{${p.key}}} ` }));
    };

    const moveBlock = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === design.blocks.length - 1) return;

        const newBlocks = [...design.blocks];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];

        setDesign(prev => ({ ...prev, blocks: newBlocks }));
    };

    // --- Render ---

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">

            {/* --- Left Column: Editor --- */}
            <div className="lg:col-span-2 flex flex-col gap-4 overflow-hidden">

                {/* Toolbar */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => addBlock('heading')} title="Add Heading">
                            <HeadingIcon className="h-4 w-4 mr-1" /> Heading
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => addBlock('paragraph')} title="Add Text">
                            <Type className="h-4 w-4 mr-1" /> Text
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => addBlock('button')} title="Add Button">
                            <MousePointerClick className="h-4 w-4 mr-1" /> Button
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => addBlock('divider')} title="Add Divider">
                            <Minus className="h-4 w-4 mr-1" /> Divider
                        </Button>
                    </div>

                    <Button onClick={() => onSave(design)} disabled={isLoading}>
                        <Save className="h-4 w-4 mr-2" />
                        {isLoading ? 'Saving...' : 'Save Template'}
                    </Button>
                </div>

                {/* Scrollable Editor Area */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50 rounded-lg border p-6 space-y-6">

                    {/* Subject Line */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border shadow-sm space-y-2">
                        <Label>Email Subject</Label>
                        <div className="flex gap-2">
                            <Input
                                value={design.subject}
                                onChange={e => handleSubjectChange(e.target.value)}
                                placeholder="Enter email subject..."
                                className="font-medium"
                            />
                            <PlaceholderPicker onSelect={insertSubjectPlaceholder} />
                        </div>
                    </div>

                    {/* Blocks Layout */}
                    <div className="space-y-4">
                        {design.blocks.length === 0 && (
                            <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
                                <LayoutTemplate className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No content blocks yet.</p>
                                <p className="text-sm">Click the toolbar buttons to add content.</p>
                            </div>
                        )}

                        {design.blocks.map((block, index) => (
                            <div key={block.id} className="relative group">
                                {/* Reordering Controls (overlay on hover left) */}
                                <div className="absolute -left-8 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost" size="icon" className="h-6 w-6"
                                        disabled={index === 0}
                                        onClick={() => moveBlock(index, 'up')}
                                    >
                                        <span className="sr-only">Move Up</span>
                                        ▲
                                    </Button>
                                    <Button
                                        variant="ghost" size="icon" className="h-6 w-6"
                                        disabled={index === design.blocks.length - 1}
                                        onClick={() => moveBlock(index, 'down')}
                                    >
                                        <span className="sr-only">Move Down</span>
                                        ▼
                                    </Button>
                                </div>

                                {/* Block Component */}
                                {block.type === 'heading' && (
                                    <HeadingBlock
                                        data={block}
                                        onChange={d => updateBlock(block.id, d)}
                                        onRemove={() => removeBlock(block.id)}
                                    />
                                )}
                                {block.type === 'paragraph' && (
                                    <ParagraphBlock
                                        data={block}
                                        onChange={d => updateBlock(block.id, d)}
                                        onRemove={() => removeBlock(block.id)}
                                    />
                                )}
                                {block.type === 'button' && (
                                    <ButtonBlock
                                        data={block}
                                        onChange={d => updateBlock(block.id, d)}
                                        onRemove={() => removeBlock(block.id)}
                                    />
                                )}
                                {block.type === 'divider' && (
                                    <DividerBlock
                                        onRemove={() => removeBlock(block.id)}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Quick Add at Bottom */}
                    <div className="flex justify-center pt-8 pb-12">
                        <Button variant="ghost" className="text-muted-foreground text-xs" onClick={() => addBlock('paragraph')}>
                            <Plus className="h-3 w-3 mr-1" /> Add Paragraph
                        </Button>
                    </div>
                </div>
            </div>

            {/* --- Right Column: Preview --- */}
            <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-lg border shadow-sm overflow-hidden flex flex-col">
                <div className="p-3 border-b bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-medium text-sm">Live Preview</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-950">
                    {/* Email Container Simulation */}
                    <div className="bg-white max-w-sm mx-auto min-h-[400px] shadow-sm border rounded-sm overflow-hidden text-slate-800">
                        {/* Subject Header */}
                        <div className="bg-slate-50 border-b p-3 text-xs text-slate-500">
                            Subject: <span className="font-medium text-slate-800">{design.subject || '(No Subject)'}</span>
                        </div>

                        {/* Content Body */}
                        <div className="p-6 space-y-4">
                            {design.blocks.map(block => (
                                <PreviewBlock key={block.id} block={block} />
                            ))}
                        </div>

                        <div className="p-4 border-t text-xs text-center text-slate-400">
                            Footer / Unsubscribe
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}

// --- Preview Helper ---

function PreviewBlock({ block }: { block: EmailBlock }) {
    switch (block.type) {
        case 'heading':
            const HTag = `h${block.level}` as any;
            return <HTag className={`font-bold ${block.level === 1 ? 'text-2xl' : block.level === 2 ? 'text-xl' : 'text-lg'}`}>{block.text}</HTag>;
        case 'paragraph':
            return <p className="text-sm leading-relaxed whitespace-pre-wrap">{block.text}</p>;
        case 'button':
            const alignClass = block.align === 'center' ? 'text-center' : block.align === 'right' ? 'text-right' : 'text-left';
            return (
                <div className={`py-2 ${alignClass}`}>
                    <a href="#" className="inline-block bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium no-underline">
                        {block.label}
                    </a>
                </div>
            );
        case 'divider':
            return <hr className="my-4 border-slate-200" />;
        default:
            return null;
    }
}
