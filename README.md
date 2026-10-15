# WordTemplater-ts

[![npm version](https://img.shields.io/badge/npm-v1.0.0-blue.svg?style=flat-square)](https://www.npmjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg?style=flat-square)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

**WordTemplater-ts** is a lightweight, cross-platform TypeScript / JavaScript library that turns Microsoft Word (`.docx`) documents into dynamic report templates.

Runs seamlessly on **Node.js, Bun, Deno, and Client-Side Web Browsers** without any Microsoft Office installation or native binary dependencies.

---

## Key Features

- 🌐 **Full-Stack Execution**: Runs on Node.js/Bun servers and directly inside Web Browsers (client-side `.docx` generation).
- ⚡ **Zero Binary / Native Dependencies**: 100% pure TypeScript using JSZip and standard XML DOM.
- 🧭 **Deep JSON Navigation**: Dot notation (`Customer.Address.City`) and array indexing (`Items[0].Name`) case-insensitively.
- 🔁 **Nested Loops & Tables**: Full support for hierarchical loops (`«loop(items)»`...`«endloop»`) and table row cloning with alternating zebra-striping.
- 📊 **Built-in Loop Metadata**: Automatically exposes `_index`, `_first`, `_last`, `_even`, and `_odd` in every loop and table row.
- 🛡️ **Dynamic Watermarking**: Inject customizable text watermarks with custom angle, font size, and color.
- 🧩 **Extensible**: Register custom formatters and evaluators via `registerEvaluator()`.

---

## Multi-Language Ecosystem

WordTemplater is available across multiple programming languages with matching template syntax and feature parity:

| Language | Repository | Package / Install |
| :--- | :--- | :--- |
| **TypeScript / JavaScript** *(This repository)* | [WordTemplater-ts](https://github.com/luuducly/WordTemplater-ts) | `npm install wordtemplater-ts` |
| **C# (.NET)** | [WordTemplater](https://github.com/luuducly/WordTemplater) | `dotnet add package WordTemplater` |
| **Python** | [WordTemplater-python](https://github.com/luuducly/WordTemplater-python) | `pip install wordtemplater` |
| **Java** | [WordTemplater-java](https://github.com/luuducly/WordTemplater-java) | `com.github.luuducly:wordtemplater` |

---

## Installation

```bash
npm install wordtemplater-ts
```

Or with yarn / pnpm / bun:
```bash
pnpm add wordtemplater-ts
bun add wordtemplater-ts
```

---

## Quick Start

### Node.js Example

```typescript
import fs from "node:fs";
import { WordTemplate } from "wordtemplater-ts";

// 1. Prepare data
const data = {
  InvoiceNumber: "INV-2026-001",
  Customer: {
    Name: "Acme Corporation",
    Address: { City: "San Francisco", Country: "USA" }
  },
  Items: [
    { Description: "Cloud Hosting", Qty: 1, Price: 1200.00 },
    { Description: "Domain Name", Qty: 2, Price: 15.00 }
  ]
};

// 2. Load template
const templateBuffer = fs.readFileSync("Templates/Invoice.docx");
const template = await WordTemplate.load(templateBuffer);

// 3. Optional configurations
template.setWatermark("PAID", "22C55E", -45, 80);
template.enableTableZebraStriping("F8FAFC", "FFFFFF");

// 4. Export
const outputBuffer = await template.export(data);
fs.writeFileSync("Output/Invoice.docx", outputBuffer);
```

### Browser Client-Side Example

Generate Word documents directly in the user's browser without sending data to a server:

```typescript
import { WordTemplate } from "wordtemplater-ts";

async function generateReport(fileInput: File, data: any) {
  const arrayBuffer = await fileInput.arrayBuffer();
  const template = await WordTemplate.load(arrayBuffer);

  const outputBuffer = await template.export(data);

  // Trigger download in browser
  const blob = new Blob([outputBuffer], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Report.docx";
  a.click();
  URL.revokeObjectURL(url);
}
```

---

## Template Syntax & Evaluators Cheat Sheet

| Placeholder Syntax | Description | Example Input | Example Output |
| :--- | :--- | :--- | :--- |
| `«upper(Name)»` | Converts text to uppercase | `"acme corp"` | `ACME CORP` |
| `«lower(Code)»` | Converts text to lowercase | `"PROD-XYZ"` | `prod-xyz` |
| `«trim(Note)»` | Trims leading/trailing whitespace | `"  hello  "` | `hello` |
| `«sub(Text, 0, 4)»` | Substring `(start, length)` | `"WORDTEMPLATER"` | `WORD` |
| `«left(Code, 3)»` | First `N` characters | `"INV-9988"` | `INV` |
| `«right(Code, 4)»` | Last `N` characters | `"INV-9988"` | `9988` |
| `«replace(Text, '-', '/')»` | Replaces occurrences of string | `"2026-10-15"` | `2026/10/15` |
| `«padleft(Number, 6, '0')»` | Left-pads string to target width | `42` | `000042` |
| `«padright(Code, 8, '_')»` | Right-pads string to target width | `"A1"` | `A1______` |
| `«currency(Amount, 'en-US')»` | Formats number as currency with culture | `1500000` | `$1,500,000.00` |
| `«currency(Amount, 'vi-VN')»` | Vietnamese currency format | `1500000` | `1.500.000 ₫` |
| `«number(Score, '', 'en-US')»` | Formats numbers with thousand separators | `1234567` | `1,234,567` |
| `«percentage(Ratio)»` | Formats number as percentage | `0.85` | `85.00%` |
| `«date(CreatedAt, 'dd/MM/yyyy')»` | Formats date with pattern | Date / ISO string | `15/10/2026` |
| `«default(Phone, 'N/A')»` | Fallback value if null, undefined, or empty | `null` | `N/A` |
| `«if(IsVIP, 'Gold', 'Standard')»` | Conditional text based on boolean | `true` | `Gold` |

---

## Repeating Tables & Zebra Striping

Repeat rows in a Word table:

| No. | Description | Qty | Unit Price |
| :--- | :--- | :--- | :--- |
| `«table(Items)»«_index»` | `«Description»` | `«Qty»` | `«currency(Price)»«endtable»` |

### Alternating Row Shading
Inside Word Template:
```text
«table(Items, 'F8FAFC', 'FFFFFF')»
```
Or via TypeScript API:
```typescript
template.enableTableZebraStriping("F8FAFC", "FFFFFF");
```

---

## Custom Evaluators

```typescript
import { IEvaluator, WordTemplate } from "wordtemplater-ts";

class SlugifyEvaluator implements IEvaluator {
  evaluate(value: any): string {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-");
  }
}

template.registerEvaluator("slugify", new SlugifyEvaluator());
```

In Word template:
```text
«slugify(ProductTitle)»
```

---

## Running Tests

```bash
npm test
```

---

## License

MIT License. Copyright (c) 2026 Lưu Đức Ly.
