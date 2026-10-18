import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { apiHeaders, apiUrl, devicePath } from './api';

export async function shareDailyReport(deviceId, kind) {
  const isPdf = kind === 'pdf';
  const filename = isPdf ? 'nursery-daily-report.pdf' : 'nursery-daily-report.csv';
  const path = devicePath(deviceId, isPdf ? 'report.pdf' : 'report.csv');
  const dest = new File(Paths.cache, filename);
  const file = await File.downloadFileAsync(apiUrl(path), dest, {
    headers: apiHeaders(),
    idempotent: true,
  });
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, {
    mimeType: isPdf ? 'application/pdf' : 'text/csv',
    UTI: isPdf ? 'com.adobe.pdf' : 'public.comma-separated-values-text',
    dialogTitle: isPdf ? 'Export PDF report' : 'Export CSV report',
  });
}
