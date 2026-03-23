import * as XLSX from 'xlsx';
import type { WorkAsset, AssetLog } from '@/lib/types/assets';
import { ASSET_STATUS_LABELS, ASSET_EVENT_LABELS } from '@/lib/types/assets';

export interface AssetExportOptions {
  fileName?: string;
  includeFinancials?: boolean;
  includeLogs?: boolean;
}

export class AssetsExporter {
  static exportToExcel(
    assets: WorkAsset[],
    logs: AssetLog[],
    options: AssetExportOptions = {}
  ): void {
    const {
      fileName = `Work_Assets_${new Date().toISOString().split('T')[0]}.xlsx`,
      includeFinancials = false,
      includeLogs = true,
    } = options;

    const workbook = XLSX.utils.book_new();

    const assetsSheet = this.createAssetsSheet(assets, includeFinancials);
    const ws1 = XLSX.utils.aoa_to_sheet(assetsSheet);
    XLSX.utils.book_append_sheet(workbook, ws1, 'Assets');

    const summarySheet = this.createSummarySheet(assets, includeFinancials);
    const ws2 = XLSX.utils.aoa_to_sheet(summarySheet);
    XLSX.utils.book_append_sheet(workbook, ws2, 'Summary');

    if (includeLogs && logs.length > 0) {
      const logsSheet = this.createLogsSheet(logs);
      const ws3 = XLSX.utils.aoa_to_sheet(logsSheet);
      XLSX.utils.book_append_sheet(workbook, ws3, 'Activity Log');
    }

    XLSX.writeFile(workbook, fileName);
  }

  private static createAssetsSheet(
    assets: WorkAsset[],
    includeFinancials: boolean
  ): (string | number | null)[][] {
    const headers: string[] = [
      'Asset #',
      'Name',
      'Type',
      'Status',
      'Assigned To',
      'Assignment Date',
      'Serial #',
      'Useful Life (yrs)',
    ];

    if (includeFinancials) {
      headers.push('Purchase Price (UGX)');
      headers.push('Purchase Date');
    }

    headers.push('Notes');

    const sheet: (string | number | null)[][] = [];
    sheet.push(['Work Assets Export']);
    sheet.push([`Generated: ${new Date().toLocaleString()}`]);
    sheet.push([]);
    sheet.push(headers);

    assets.forEach((asset) => {
      const assigneeName = asset.employee
        ? `${asset.employee.first_name} ${asset.employee.last_name}`
        : '';

      const row: (string | number | null)[] = [
        asset.asset_number,
        asset.name,
        asset.asset_type?.name ?? '',
        ASSET_STATUS_LABELS[asset.status] ?? asset.status,
        assigneeName,
        asset.assigned_at ? new Date(asset.assigned_at).toLocaleDateString() : '',
        asset.serial_number ?? '',
        asset.useful_life_years ?? '',
      ];

      if (includeFinancials) {
        row.push(asset.purchase_price ?? '');
        row.push(asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : '');
      }

      row.push(asset.notes ?? '');
      sheet.push(row);
    });

    return sheet;
  }

  private static createSummarySheet(
    assets: WorkAsset[],
    includeFinancials: boolean
  ): (string | number)[][] {
    const sheet: (string | number)[][] = [];
    sheet.push(['Summary']);
    sheet.push([]);
    sheet.push(['Total Assets', assets.length]);
    sheet.push(['Assigned', assets.filter((a) => a.assigned_to).length]);
    sheet.push(['Unassigned', assets.filter((a) => !a.assigned_to).length]);
    sheet.push([]);
    sheet.push(['By Status']);
    const statuses = ['active', 'damaged', 'lost', 'decommissioned'] as const;
    statuses.forEach((s) => {
      sheet.push([ASSET_STATUS_LABELS[s], assets.filter((a) => a.status === s).length]);
    });

    if (includeFinancials) {
      const priced = assets.filter((a) => a.purchase_price != null);
      const total = priced.reduce((sum, a) => sum + (a.purchase_price ?? 0), 0);
      sheet.push([]);
      sheet.push(['Total Asset Value (UGX)', total]);
    }

    return sheet;
  }

  private static createLogsSheet(logs: AssetLog[]): (string | number)[][] {
    const headers = ['Date', 'Event Type', 'Description', 'Logged By'];
    const sheet: (string | number)[][] = [headers];

    logs.forEach((log) => {
      const loggerName = log.logger
        ? `${log.logger.first_name} ${log.logger.last_name}`
        : '';
      sheet.push([
        new Date(log.created_at).toLocaleString(),
        ASSET_EVENT_LABELS[log.event_type] ?? log.event_type,
        log.description,
        loggerName,
      ]);
    });

    return sheet;
  }

  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
}
