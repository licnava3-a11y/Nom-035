import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = process.cwd();

describe('PDFViewer component', () => {
  it('should exist as a file', () => {
    const filePath = path.join(root, 'client/src/components/PDFViewer.tsx');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('should export PDFViewer and default export', () => {
    const filePath = path.join(root, 'client/src/components/PDFViewer.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('export function PDFViewer');
    expect(content).toContain('export default PDFViewer');
  });

  it('should support both onClose and onOpenChange props', () => {
    const filePath = path.join(root, 'client/src/components/PDFViewer.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('onClose');
    expect(content).toContain('onOpenChange');
  });

  it('should support pdfBase64 and pdfUrl props', () => {
    const filePath = path.join(root, 'client/src/components/PDFViewer.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('pdfBase64');
    expect(content).toContain('pdfUrl');
  });

  it('should have zoom controls', () => {
    const filePath = path.join(root, 'client/src/components/PDFViewer.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('zoom');
    expect(content).toContain('ZoomIn');
    expect(content).toContain('ZoomOut');
  });
});

describe('DC3Manager PDF preview integration', () => {
  it('should have PDFViewer import in DC3Manager', () => {
    const filePath = path.join(root, 'client/src/pages/DC3Manager.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('import { PDFViewer }');
    expect(content).toContain('previewPdfMutation');
    expect(content).toContain('pdfViewerOpen');
  });

  it('should have PDFViewer import in RegulatoryReports', () => {
    const filePath = path.join(root, 'client/src/pages/RegulatoryReports.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('import { PDFViewer }');
    expect(content).toContain('pdfViewerOpen');
  });
});

describe('nom035Report PDF generator', () => {
  it('should return base64 in its return type', () => {
    const filePath = path.join(root, 'server/pdfGenerators/nom035Report.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('base64: string');
    expect(content).toContain("pdfBuffer.toString('base64')");
  });
});
