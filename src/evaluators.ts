import { IEvaluator } from "./types.js";

export class UpperEvaluator implements IEvaluator {
  evaluate(value: any): string {
    return value != null ? String(value).toUpperCase() : "";
  }
}

export class LowerEvaluator implements IEvaluator {
  evaluate(value: any): string {
    return value != null ? String(value).toLowerCase() : "";
  }
}

export class TrimEvaluator implements IEvaluator {
  evaluate(value: any): string {
    return value != null ? String(value).trim() : "";
  }
}

export class SubEvaluator implements IEvaluator {
  evaluate(value: any, parameters: any[]): string {
    if (value == null) return "";
    const str = String(value);
    const start = Number(parameters[0]) || 0;
    const length = parameters[1] !== undefined ? Number(parameters[1]) : undefined;
    if (length !== undefined) {
      return str.substring(start, start + length);
    }
    return str.substring(start);
  }
}

export class LeftEvaluator implements IEvaluator {
  evaluate(value: any, parameters: any[]): string {
    if (value == null) return "";
    const str = String(value);
    const count = Number(parameters[0]) || 0;
    return str.substring(0, Math.min(count, str.length));
  }
}

export class RightEvaluator implements IEvaluator {
  evaluate(value: any, parameters: any[]): string {
    if (value == null) return "";
    const str = String(value);
    const count = Number(parameters[0]) || 0;
    if (count <= 0) return "";
    if (count >= str.length) return str;
    return str.substring(str.length - count);
  }
}

export class ReplaceEvaluator implements IEvaluator {
  evaluate(value: any, parameters: any[]): string {
    if (value == null) return "";
    const str = String(value);
    const search = parameters[0] !== undefined ? String(parameters[0]) : "";
    const replaceWith = parameters[1] !== undefined ? String(parameters[1]) : "";
    return str.split(search).join(replaceWith);
  }
}

export class PadLeftEvaluator implements IEvaluator {
  evaluate(value: any, parameters: any[]): string {
    if (value == null) return "";
    const str = String(value);
    const totalWidth = Number(parameters[0]) || str.length;
    const paddingChar = parameters[1] !== undefined ? String(parameters[1])[0] : " ";
    return str.padStart(totalWidth, paddingChar);
  }
}

export class PadRightEvaluator implements IEvaluator {
  evaluate(value: any, parameters: any[]): string {
    if (value == null) return "";
    const str = String(value);
    const totalWidth = Number(parameters[0]) || str.length;
    const paddingChar = parameters[1] !== undefined ? String(parameters[1])[0] : " ";
    return str.padEnd(totalWidth, paddingChar);
  }
}

export class CurrencyEvaluator implements IEvaluator {
  evaluate(value: any, parameters: any[]): string {
    if (value == null || value === "") return "";
    const num = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]+/g, ""));
    if (isNaN(num)) return String(value);

    const locale = parameters[0] ? String(parameters[0]) : "en-US";
    let currencyCode = "USD";
    if (locale.toLowerCase().startsWith("vi")) {
      currencyCode = "VND";
    } else if (locale.toLowerCase().startsWith("de") || locale.toLowerCase().startsWith("fr")) {
      currencyCode = "EUR";
    } else if (locale.toLowerCase().startsWith("ja")) {
      currencyCode = "JPY";
    }

    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: currencyCode === "VND" || currencyCode === "JPY" ? 0 : 2
      }).format(num);
    } catch {
      return num.toLocaleString();
    }
  }
}

export class NumberEvaluator implements IEvaluator {
  evaluate(value: any, parameters: any[]): string {
    if (value == null || value === "") return "";
    const num = Number(value);
    if (isNaN(num)) return String(value);

    const locale = parameters[1] ? String(parameters[1]) : "en-US";
    try {
      return new Intl.NumberFormat(locale).format(num);
    } catch {
      return num.toString();
    }
  }
}

export class PercentageEvaluator implements IEvaluator {
  evaluate(value: any): string {
    if (value == null || value === "") return "";
    const num = Number(value);
    if (isNaN(num)) return String(value);
    return `${(num * 100).toFixed(2)}%`;
  }
}

export class DateEvaluator implements IEvaluator {
  evaluate(value: any, parameters: any[]): string {
    if (value == null || value === "") return "";
    const date = value instanceof Date ? value : new Date(String(value));
    if (isNaN(date.getTime())) return String(value);

    const format = parameters[0] ? String(parameters[0]) : "yyyy-MM-dd";
    const locale = parameters[1] ? String(parameters[1]) : "en-US";

    // Simple pattern matching for common formats
    if (format === "dd/MM/yyyy") {
      const d = String(date.getDate()).padStart(2, "0");
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const y = date.getFullYear();
      return `${d}/${m}/${y}`;
    }
    if (format === "yyyy-MM-dd") {
      const d = String(date.getDate()).padStart(2, "0");
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const y = date.getFullYear();
      return `${y}-${m}-${d}`;
    }
    if (format === "MM/dd/yyyy") {
      const d = String(date.getDate()).padStart(2, "0");
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const y = date.getFullYear();
      return `${m}/${d}/${y}`;
    }

    try {
      return date.toLocaleDateString(locale);
    } catch {
      return date.toISOString();
    }
  }
}

export class DefaultValueEvaluator implements IEvaluator {
  evaluate(value: any, parameters: any[]): any {
    if (value === null || value === undefined || value === "") {
      return parameters[0] !== undefined ? parameters[0] : "";
    }
    return value;
  }
}

export class IfEvaluator implements IEvaluator {
  evaluate(value: any, parameters: any[]): any {
    const isTruthy = Boolean(value) && value !== "false" && value !== "0";
    if (isTruthy) {
      return parameters[0] !== undefined ? parameters[0] : "";
    }
    return parameters[1] !== undefined ? parameters[1] : "";
  }
}
