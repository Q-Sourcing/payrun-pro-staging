/**
 * TableSkeleton Component
 * 
 * Skeleton loader for table rows during data fetching
 */

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { TableRow, TableCell } from '@/components/ui/table';

interface TableSkeletonProps {
    /** Number of columns */
    columns: number;
    /** Number of rows to display */
    rows?: number;
}

export function TableSkeleton({ columns, rows = 5 }: TableSkeletonProps) {
    return (
        <>
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <TableCell key={colIndex}>
                            <Skeleton className="h-4 w-full" />
                        </TableCell>
                    ))}
                </TableRow>
            ))}
        </>
    );
}
