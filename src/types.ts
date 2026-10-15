export interface IEvaluator {
  evaluate(value: any, parameters: any[]): any;
}

export interface ExportOptions {
  watermarkText?: string;
  watermarkColor?: string;
  watermarkAngle?: number;
  watermarkFontSize?: number;
  watermarkFontName?: string;
  tableOddRowColor?: string;
  tableEvenRowColor?: string;
  removeFallback?: boolean;
}

export interface ParsedField {
  raw: string;
  funcName: string;
  fieldPath: string;
  args: any[];
}
