/**
 * PaginationControls Component
 * 
 * Reusable pagination controls with page numbers, prev/next buttons, and page size selector
 */

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    PageSize,
    PAGE_SIZE_OPTIONS,
    calculatePaginationInfo,
    getVisiblePageNumbers,
} from '@/lib/types/pagination';
import { formatPaginationText } from '@/lib/utils/paginationUtils';
import { cn } from '@/lib/utils';

interface PaginationControlsProps {
    /** Current page number (1-indexed) */
    currentPage: number;
    /** Items per page */
    pageSize: PageSize;
    /** Total number of items */
    total: number;
    /** Callback when page changes */
    onPageChange: (page: number) => void;
    /** Callback when page size changes */
    onPageSizeChange: (size: PageSize) => void;
    /** Whether data is currently loading */
    isLoading?: boolean;
    /** Additional CSS classes */
    className?: string;
}

export function PaginationControls({
    currentPage,
    pageSize,
    total,
    onPageChange,
    onPageSizeChange,
    isLoading = false,
    className,
}: PaginationControlsProps) {
    const paginationInfo = calculatePaginationInfo(currentPage, pageSize, total);
    const visiblePages = getVisiblePageNumbers(currentPage, paginationInfo.totalPages);

    if (total === 0) {
        return null;
    }

    return (
        <div className={cn('flex items-center justify-between gap-4 px-2', className)}>
            {/* Left side: Showing X-Y of Z items */}
            <div className="text-sm text-muted-foreground">
                {formatPaginationText(paginationInfo.start, paginationInfo.end, paginationInfo.total)}
            </div>

            {/* Center: Page numbers */}
            <div className="flex items-center gap-1">
                {/* Previous button */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={!paginationInfo.hasPrev || isLoading}
                    className="h-8 w-8 p-0"
                >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Previous page</span>
                </Button>

                {/* Page numbers */}
                {visiblePages.map((pageNum) => (
                    <Button
                        key={pageNum}
                        variant={pageNum === currentPage ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onPageChange(pageNum)}
                        disabled={isLoading}
                        className="h-8 w-8 p-0"
                    >
                        {pageNum}
                    </Button>
                ))}

                {/* Next button */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={!paginationInfo.hasNext || isLoading}
                    className="h-8 w-8 p-0"
                >
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">Next page</span>
                </Button>
            </div>

            {/* Right side: Page size selector */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Items per page:</span>
                <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => onPageSizeChange(parseInt(value, 10) as PageSize)}
                    disabled={isLoading}
                >
                    <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {PAGE_SIZE_OPTIONS.map((size) => (
                            <SelectItem key={size} value={size.toString()}>
                                {size}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
