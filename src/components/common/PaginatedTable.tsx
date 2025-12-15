/**
 * PaginatedTable Component
 * 
 * Generic table component with built-in pagination, loading states, and empty states
 */

import React, { ReactNode } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { PaginationControls } from './PaginationControls';
import { TableSkeleton } from './TableSkeleton';
import { PageSize } from '@/lib/types/pagination';
import { cn } from '@/lib/utils';

export interface ColumnDef<T> {
    /** Column header text */
    header: string;
    /** Accessor function to get cell value from row data */
    accessor: (row: T) => ReactNode;
    /** Optional CSS class for the column */
    className?: string;
    /** Optional CSS class for the header */
    headerClassName?: string;
}

interface PaginatedTableProps<T> {
    /** Array of data to display */
    data: T[];
    /** Column definitions */
    columns: ColumnDef<T>[];
    /** Current page number */
    currentPage: number;
    /** Items per page */
    pageSize: PageSize;
    /** Total number of items */
    total: number;
    /** Callback when page changes */
    onPageChange: (page: number) => void;
    /** Callback when page size changes */
    onPageSizeChange: (size: PageSize) => void;
    /** Whether data is loading */
    isLoading?: boolean;
    /** Error message to display */
    error?: string | null;
    /** Empty state message */
    emptyMessage?: string;
    /** Empty state action button */
    emptyAction?: ReactNode;
    /** Additional CSS classes for the container */
    className?: string;
    /** Whether to make the header sticky */
    stickyHeader?: boolean;
    /** Key extractor for rows */
    getRowKey?: (row: T, index: number) => string;
}

export function PaginatedTable<T>({
    data,
    columns,
    currentPage,
    pageSize,
    total,
    onPageChange,
    onPageSizeChange,
    isLoading = false,
    error = null,
    emptyMessage = 'No items found',
    emptyAction,
    className,
    stickyHeader = true,
    getRowKey = (_, index) => index.toString(),
}: PaginatedTableProps<T>) {
    // Error state
    if (error) {
        return (
            <Card className={className}>
                <CardContent className="py-8">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    // Empty state (when not loading and no data)
    if (!isLoading && data.length === 0) {
        return (
            <Card className={className}>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 text-4xl">📋</div>
                    <h3 className="mb-2 text-lg font-medium">{emptyMessage}</h3>
                    {emptyAction && <div className="mt-4">{emptyAction}</div>}
                </CardContent>
            </Card>
        );
    }

    return (
        <div className={cn('space-y-4', className)}>
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className={cn(stickyHeader && 'sticky top-0 z-10 bg-background')}>
                                <TableRow>
                                    {columns.map((column, index) => (
                                        <TableHead
                                            key={index}
                                            className={cn(
                                                'bg-muted/50 font-medium',
                                                column.headerClassName
                                            )}
                                        >
                                            {column.header}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableSkeleton columns={columns.length} rows={pageSize} />
                                ) : (
                                    data.map((row, rowIndex) => (
                                        <TableRow key={getRowKey(row, rowIndex)}>
                                            {columns.map((column, colIndex) => (
                                                <TableCell
                                                    key={colIndex}
                                                    className={column.className}
                                                >
                                                    {column.accessor(row)}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Pagination Controls */}
            {total > 0 && (
                <PaginationControls
                    currentPage={currentPage}
                    pageSize={pageSize}
                    total={total}
                    onPageChange={onPageChange}
                    onPageSizeChange={onPageSizeChange}
                    isLoading={isLoading}
                />
            )}
        </div>
    );
}
