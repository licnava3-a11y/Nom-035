declare module 'html-pdf-node' {
  interface PDFOptions {
    format?: string;
    printBackground?: boolean;
    margin?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
  }

  interface FileInput {
    content: string;
    url?: string;
  }

  function generatePdf(file: FileInput, options?: PDFOptions): Promise<Buffer>;
  function generatePdfs(files: FileInput[], options?: PDFOptions): Promise<Buffer[]>;

  export { generatePdf, generatePdfs, PDFOptions, FileInput };
  export default { generatePdf, generatePdfs };
}
