declare module 'react-pdf' {
  export const pdfjs: any;
  export const Document: any;
  export const Page: any;
}

declare module '@react-pdf/renderer' {
  export const Document: any;
  export const Page: any;
  export const Text: any;
  export const View: any;
  export const StyleSheet: any;
  export const Font: any;
  export const Image: any;
  export const PDFViewer: any;
  export const PDFDownloadLink: any;
  export const pdf: any;
  export const renderToStream: any;
  export const renderToBuffer: any;
}

declare module 'bcryptjs' {
  export function hash(data: string, saltOrRounds: string | number): Promise<string>;
  export function hashSync(data: string, saltOrRounds: string | number): string;
  export function compare(data: string, encrypted: string): Promise<boolean>;
  export function compareSync(data: string, encrypted: string): boolean;
  export function genSalt(rounds?: number): Promise<string>;
  export function genSaltSync(rounds?: number): string;
}

declare module 'qrcode.react' {
  export interface QRCodeSVGProps {
    value: string;
    size?: number;
    bgColor?: string;
    fgColor?: string;
    level?: 'L' | 'M' | 'Q' | 'H';
    includeMargin?: boolean;
    marginSize?: number;
    imageSettings?: {
      src: string;
      height: number;
      width: number;
      excavate?: boolean;
    };
  }
  export const QRCodeSVG: React.ComponentType<QRCodeSVGProps>;
} 