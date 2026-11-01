import { jsPDF } from 'jspdf';
import { SecurityFinding } from '../types';
import { formatDate } from './formatters';

/**
 * Generates and triggers download of a clean CSV spreadsheet from findings
 */
export function exportFindingsToCsv(findings: SecurityFinding[], filename = 'security-findings-report.csv'): boolean {
  if (!findings || findings.length === 0) {
    throw new Error('No findings available to export.');
  }

  const headers = [
    'Finding ID',
    'Timestamp',
    'Severity',
    'Status',
    'Event Type',
    'User/Role',
    'Source IP',
    'Country',
    'Location',
    'Region',
    'Affected Resource',
    'Rule ID',
    'Description',
    'Reason Flagged',
  ];

  const escapeCsv = (str: string | undefined | null): string => {
    if (str === undefined || str === null) return '""';
    const value = String(str);
    const safeValue = /^[\t\r\n ]*[=+\-@]/.test(value) ? `'${value}` : value;
    const escaped = safeValue.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const rows = findings.map((f) => [
    escapeCsv(f.finding_id || f.id),
    escapeCsv(f.timestamp),
    escapeCsv(f.severity),
    escapeCsv(f.status),
    escapeCsv(f.event_type_name || f.eventTypeName),
    escapeCsv(f.user_or_role || f.userOrRole),
    escapeCsv(f.source_ip || f.sourceIp),
    escapeCsv(f.country || f.location),
    escapeCsv(f.location),
    escapeCsv(f.region),
    escapeCsv(f.resource),
    escapeCsv(f.rule_id || f.ruleId),
    escapeCsv(f.description),
    escapeCsv(f.reason_flagged || f.whyFlagged),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);

  return true;
}

/**
 * Generates and downloads a clean, multi-page PDF report from findings using jsPDF
 */
export function exportFindingsToPdf(
  findings: SecurityFinding[],
  filterSummary = 'All Active Findings',
  filename = 'cloud-security-report.pdf'
): boolean {
  if (!findings || findings.length === 0) {
    throw new Error('No findings to include in PDF export.');
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  let currentY = 50;

  // Header banner
  doc.setFillColor(37, 99, 235); // brand-600 blue
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('Cloud Security Monitor', margin, currentY);
  currentY += 18;

  // Subtitle & Metadata
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Security Detections & Audit Report', margin, currentY);
  currentY += 16;

  const generatedDate = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  doc.text(`Generated: ${generatedDate}  |  Scope: ${filterSummary}  |  Total Records: ${findings.length}`, margin, currentY);
  currentY += 20;

  // Separator
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 20;

  // Severity summary badges row
  const criticalCount = findings.filter((f) => f.severity.toLowerCase() === 'critical').length;
  const highCount = findings.filter((f) => f.severity.toLowerCase() === 'high').length;
  const mediumCount = findings.filter((f) => f.severity.toLowerCase() === 'medium').length;
  const lowCount = findings.filter((f) => f.severity.toLowerCase() === 'low').length;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  const boxWidth = (pageWidth - margin * 2 - 30) / 4;

  const drawStat = (x: number, label: string, val: number, color: [number, number, number]) => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, currentY, boxWidth, 34, 4, 4, 'FD');

    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(`${label}: ${val}`, x + 10, currentY + 21);
  };

  drawStat(margin, 'CRITICAL', criticalCount, [220, 38, 38]);
  drawStat(margin + boxWidth + 10, 'HIGH', highCount, [234, 88, 12]);
  drawStat(margin + (boxWidth + 10) * 2, 'MEDIUM', mediumCount, [217, 119, 6]);
  drawStat(margin + (boxWidth + 10) * 3, 'LOW', lowCount, [22, 163, 74]);

  currentY += 50;

  // Section title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Detailed Incident Findings', margin, currentY);
  currentY += 16;

  // Render Findings
  findings.forEach((f, index) => {
    if (currentY + 110 > pageHeight - margin) {
      doc.addPage();
      currentY = 50;
    }

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 85, 4, 4, 'FD');

    const sevColors: Record<string, [number, number, number]> = {
      critical: [220, 38, 38],
      high: [234, 88, 12],
      medium: [217, 119, 6],
      low: [22, 163, 74],
    };
    const barColor = sevColors[f.severity.toLowerCase()] || [100, 116, 139];
    doc.setFillColor(barColor[0], barColor[1], barColor[2]);
    doc.rect(margin, currentY, 4, 85, 'F');

    // Title & ID
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    const titleText = `${index + 1}. [${f.finding_id || f.id}] ${f.description || f.title}`;
    doc.text(titleText.length > 80 ? titleText.slice(0, 78) + '...' : titleText, margin + 14, currentY + 18);

    // Meta row 1
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Severity: ${f.severity}   |   Status: ${f.status}   |   Source: ${f.source}   |   Detected: ${formatDate(f.timestamp)}`,
      margin + 14,
      currentY + 34
    );

    // Meta row 2
    doc.text(
      `Actor: ${f.user_or_role || f.userOrRole}   |   IP: ${f.source_ip || f.sourceIp} (${f.location || f.country})   |   Region: ${f.region}`,
      margin + 14,
      currentY + 48
    );

    // Reason
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const desc = `Why flagged: ${f.reason_flagged || f.whyFlagged}`;
    doc.text(desc.length > 110 ? desc.slice(0, 108) + '...' : desc, margin + 14, currentY + 64);

    // Action
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(37, 99, 235);
    const actions = f.recommended_action || f.recommendedAction || [];
    const firstAction = Array.isArray(actions) ? actions[0] : actions;
    const action = `Action: ${firstAction || 'Not provided by backend.'}`;
    doc.text(action.length > 110 ? action.slice(0, 108) + '...' : action, margin + 14, currentY + 77);

    currentY += 95;
  });

  // Footer on last page
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Cloud Security Monitor — Production Security Operations Audit Report',
    margin,
    pageHeight - 20
  );

  doc.save(filename);
  return true;
}
