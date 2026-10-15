import { ParsedField } from "./types.js";

/**
 * Resolves a property path from an object or array, case-insensitively,
 * supporting dot notation and array indexing (e.g., "Customer.Address.City", "Items[0].Name").
 */
export function resolveToken(data: any, path: string): any {
  if (data == null || !path) return undefined;

  const normalizedPath = path.trim();
  if (!normalizedPath) return undefined;

  // Split by dot or array index: e.g. "a.b[0].c" -> ["a", "b", "0", "c"]
  const parts: string[] = [];
  const regex = /([^[.\]]+)|\[(\d+)\]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(normalizedPath)) !== null) {
    if (match[1] !== undefined) {
      parts.push(match[1]);
    } else if (match[2] !== undefined) {
      parts.push(match[2]);
    }
  }

  let current: any = data;

  for (const part of parts) {
    if (current == null) return undefined;

    // Check array index
    if (Array.isArray(current)) {
      const idx = parseInt(part, 10);
      if (!isNaN(idx) && idx >= 0 && idx < current.length) {
        current = current[idx];
        continue;
      }
      return undefined;
    }

    // Object property resolution (case-insensitive)
    if (typeof current === "object") {
      if (part in current) {
        current = current[part];
        continue;
      }

      // Case-insensitive fallback
      const lowerPart = part.toLowerCase();
      const matchedKey = Object.keys(current).find(
        (k) => k.toLowerCase() === lowerPart
      );

      if (matchedKey !== undefined) {
        current = current[matchedKey];
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Parses placeholder expressions such as:
 * - "Customer.Name" -> funcName: "", fieldPath: "Customer.Name", args: []
 * - "upper(Name)" -> funcName: "upper", fieldPath: "Name", args: []
 * - "currency(Total, 'vi-VN')" -> funcName: "currency", fieldPath: "Total", args: ["vi-VN"]
 * - "table(Items, 'F9FAFB', 'FFFFFF')" -> funcName: "table", fieldPath: "Items", args: ["F9FAFB", "FFFFFF"]
 */
export function parseExpression(rawExpr: string): ParsedField {
  const clean = rawExpr.trim().replace(/^«|»$/g, "").trim();

  // Check if it's a function call: funcName(args...)
  const funcMatch = clean.match(/^([a-zA-Z0-9_]+)\s*\((.*)\)$/);
  if (!funcMatch) {
    return {
      raw: rawExpr,
      funcName: "",
      fieldPath: clean,
      args: []
    };
  }

  const funcName = funcMatch[1].toLowerCase();
  const rawArgs = funcMatch[2].trim();

  if (!rawArgs) {
    return {
      raw: rawExpr,
      funcName,
      fieldPath: "",
      args: []
    };
  }

  // Parse comma-separated arguments, respecting quotes
  const parsedArgs = splitArguments(rawArgs);
  const fieldPath = parsedArgs[0] ?? "";
  const remainingArgs = parsedArgs.slice(1);

  return {
    raw: rawExpr,
    funcName,
    fieldPath,
    args: remainingArgs
  };
}

function splitArguments(argString: string): any[] {
  const args: any[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < argString.length; i++) {
    const c = argString[i];

    if (inQuotes) {
      if (c === quoteChar) {
        inQuotes = false;
      } else {
        current += c;
      }
    } else {
      if (c === "'" || c === '"') {
        inQuotes = true;
        quoteChar = c;
      } else if (c === ",") {
        args.push(parseArgValue(current.trim()));
        current = "";
      } else {
        current += c;
      }
    }
  }

  if (current.trim()) {
    args.push(parseArgValue(current.trim()));
  }

  return args;
}

function parseArgValue(val: string): any {
  if (val === "true") return true;
  if (val === "false") return false;
  if (val === "null") return null;
  const num = Number(val);
  if (!isNaN(num) && val !== "") return num;
  return val;
}
