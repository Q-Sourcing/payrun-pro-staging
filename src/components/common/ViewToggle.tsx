/**
 * ViewToggle Component
 * 
 * Toggle between table and card view layouts
 */

import React from 'react';
import { LayoutGrid, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ViewMode } from '@/lib/types/pagination';
import { cn } from '@/lib/utils';

interface ViewToggleProps {
    /** Current view mode */
    view: ViewMode;
    /** Callback when view changes */
    onViewChange: (view: ViewMode) => void;
    /** Additional CSS classes */
    className?: string;
}

export function ViewToggle({ view, onViewChange, className }: ViewToggleProps) {
    return (
        <div className={cn('flex items-center gap-1 rounded-md border p-1', className)}>
            <Button
                variant={view === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('table')}
                className="h-7 px-2"
            >
                <Table className="h-4 w-4" />
                <span className="sr-only">Table view</span>
            </Button>
            <Button
                variant={view === 'card' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('card')}
                className="h-7 px-2"
            >
                <LayoutGrid className="h-4 w-4" />
                <span className="sr-only">Card view</span>
            </Button>
        </div>
    );
}
