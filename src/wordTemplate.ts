import JSZip from "jszip";
import { ExportOptions, IEvaluator } from "./types.js";
import { parseExpression, resolveToken } from "./utils.js";
import {
  CurrencyEvaluator,
  DateEvaluator,
  DefaultValueEvaluator,
  IfEvaluator,
  LeftEvaluator,
  LowerEvaluator,
  NumberEvaluator,
  PadLeftEvaluator,
  PadRightEvaluator,
  PercentageEvaluator,
  ReplaceEvaluator,
  RightEvaluator,
  SubEvaluator,
  TrimEvaluator,
  UpperEvaluator
} from "./evaluators.js";
import {
  createWatermarkParagraph,
  parseXml,
  serializeXml,
  setRowShading,
  W_NS
} from "./wordUtils.js";

export class WordTemplate {
  private zip: JSZip;
  private evaluators: Map<string, IEvaluator> = new Map();
  private defaultOptions: ExportOptions = {};

  private constructor(zip: JSZip) {
    this.zip = zip;
    this.registerDefaultEvaluators();
  }

  private registerDefaultEvaluators(): void {
    this.registerEvaluator("upper", new UpperEvaluator());
    this.registerEvaluator("lower", new LowerEvaluator());
    this.registerEvaluator("trim", new TrimEvaluator());
    this.registerEvaluator("sub", new SubEvaluator());
    this.registerEvaluator("left", new LeftEvaluator());
    this.registerEvaluator("right", new RightEvaluator());
    this.registerEvaluator("replace", new ReplaceEvaluator());
    this.registerEvaluator("padleft", new PadLeftEvaluator());
    this.registerEvaluator("padright", new PadRightEvaluator());
    this.registerEvaluator("currency", new CurrencyEvaluator());
    this.registerEvaluator("number", new NumberEvaluator());
    this.registerEvaluator("percentage", new PercentageEvaluator());
    this.registerEvaluator("date", new DateEvaluator());
    this.registerEvaluator("default", new DefaultValueEvaluator());
    this.registerEvaluator("coalesce", new DefaultValueEvaluator());
    this.registerEvaluator("if", new IfEvaluator());
  }

  /**
   * Loads a Word (.docx) document from Buffer, Uint8Array, or ArrayBuffer
   */
  public static async load(data: Buffer | Uint8Array | ArrayBuffer): Promise<WordTemplate> {
    const zip = await JSZip.loadAsync(data);
    return new WordTemplate(zip);
  }

  /**
   * Registers a custom evaluator
   */
  public registerEvaluator(name: string, evaluator: IEvaluator): void {
    this.evaluators.set(name.toLowerCase(), evaluator);
  }

  /**
   * Configures dynamic watermark for exported document
   */
  public setWatermark(
    text: string,
    color: string = "C0C0C0",
    angle: number = -45,
    fontSize: number = 72,
    fontName: string = "Calibri"
  ): void {
    this.defaultOptions.watermarkText = text;
    this.defaultOptions.watermarkColor = color;
    this.defaultOptions.watermarkAngle = angle;
    this.defaultOptions.watermarkFontSize = fontSize;
    this.defaultOptions.watermarkFontName = fontName;
  }

  /**
   * Enables automatic table zebra striping
   */
  public enableTableZebraStriping(oddColor: string = "F9FAFB", evenColor: string = "FFFFFF"): void {
    this.defaultOptions.tableOddRowColor = oddColor;
    this.defaultOptions.tableEvenRowColor = evenColor;
  }

  /**
   * Renders the template with data and returns the exported .docx Buffer
   */
  public async export(data: any, options?: ExportOptions): Promise<Buffer> {
    const mergedOptions: ExportOptions = {
      ...this.defaultOptions,
      ...options
    };

    // 1. Process document.xml
    const docXmlFile = this.zip.file("word/document.xml");
    if (!docXmlFile) {
      throw new Error("Invalid .docx file: word/document.xml not found.");
    }

    let docXml = await docXmlFile.async("string");
    const doc = parseXml(docXml);

    // 2. Process Tables (repeating rows & zebra striping)
    this.processTables(doc, data, mergedOptions);

    // 3. Process Loops (repeating paragraphs/blocks)
    this.processLoops(doc, data);

    // 4. Process Simple MergeFields & Direct Placeholders
    this.processFields(doc, data);

    // Serialize modified document.xml back
    const modifiedXml = serializeXml(doc);
    this.zip.file("word/document.xml", modifiedXml);

    // 5. Inject Watermark into Headers if requested
    if (mergedOptions.watermarkText) {
      await this.applyWatermark(mergedOptions);
    }

    // 6. Generate final .docx binary
    return await this.zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    });
  }

  private processFields(doc: Document, data: any): void {
    // 1. Process <w:fldSimple> tags
    const simpleFields = Array.from(doc.getElementsByTagNameNS(W_NS, "fldSimple"));
    for (const fld of simpleFields) {
      const instr = fld.getAttributeNS(W_NS, "instr") || fld.getAttribute("w:instr") || "";
      let rawExpr = instr.replace(/MERGEFIELD/i, "").trim();
      const mfIdx = rawExpr.indexOf("\\* MERGEFORMAT");
      if (mfIdx >= 0) rawExpr = rawExpr.substring(0, mfIdx).trim();
      rawExpr = rawExpr.replace(/^["'«]+|["'»]+$/g, "").trim();

      if (rawExpr) {
        const value = this.evaluateExpression(rawExpr, data);
        const p = doc.createElementNS(W_NS, "w:r");
        const t = doc.createElementNS(W_NS, "w:t");
        t.textContent = value != null ? String(value) : "";
        p.appendChild(t);
        fld.parentNode?.replaceChild(p, fld);
      }
    }

    // 2. Remove complex field instructions <w:instrText> and <w:fldChar>
    const instrNodes = Array.from(doc.getElementsByTagNameNS(W_NS, "instrText"));
    for (const instr of instrNodes) {
      instr.parentNode?.removeChild(instr);
    }
    const fldChars = Array.from(doc.getElementsByTagNameNS(W_NS, "fldChar"));
    for (const fc of fldChars) {
      fc.parentNode?.removeChild(fc);
    }

    // 3. Process direct text placeholders in <w:p>
    const paragraphs = Array.from(doc.getElementsByTagNameNS(W_NS, "p"));
    const placeholderRegex = /«([^»]+)»/g;

    for (const p of paragraphs) {
      const textNodes = Array.from(p.getElementsByTagNameNS(W_NS, "t"));
      if (textNodes.length === 0) continue;

      // Check if paragraph text contains placeholder
      const combined = textNodes.map((t) => t.textContent || "").join("");
      if (placeholderRegex.test(combined)) {
        const evaluated = combined.replace(placeholderRegex, (_, expr) => {
          const val = this.evaluateExpression(expr, data);
          return val != null ? String(val) : "";
        });

        // Set evaluated text to first text node and clear the rest
        textNodes[0].textContent = evaluated;
        for (let i = 1; i < textNodes.length; i++) {
          textNodes[i].textContent = "";
        }
      }
    }
  }

  private processTables(doc: Document, data: any, options: ExportOptions): void {
    const tableNodes = Array.from(doc.getElementsByTagNameNS(W_NS, "tbl"));

    for (const tbl of tableNodes) {
      const rows = Array.from(tbl.getElementsByTagNameNS(W_NS, "tr"));

      for (const row of rows) {
        const rowText = row.textContent || "";
        const tableMatch = rowText.match(/«table\(([^)]+)\)»/i);

        if (tableMatch) {
          const parsed = parseExpression(tableMatch[0]);
          const arrayPath = parsed.fieldPath;
          const items = resolveToken(data, arrayPath);

          const oddColor = parsed.args[0] || options.tableOddRowColor;
          const evenColor = parsed.args[1] || options.tableEvenRowColor;

          if (Array.isArray(items) && items.length > 0) {
            const parent = row.parentNode;
            if (!parent) continue;

            const baseRowXml = serializeXml(row);

            // Create row for each item
            items.forEach((item, index) => {
              const itemRowDoc = parseXml(baseRowXml);
              const clonedRow = itemRowDoc.documentElement;

              // Loop metadata
              const itemContext = {
                ...(typeof item === "object" ? item : { item }),
                _index: index + 1,
                _first: index === 0,
                _last: index === items.length - 1,
                _even: (index + 1) % 2 === 0,
                _odd: (index + 1) % 2 !== 0
              };

              // Clean table(...) and endtable markers
              this.replaceRowPlaceholders(clonedRow, itemContext);

              // Apply Zebra striping if enabled
              if (oddColor && (index + 1) % 2 !== 0) {
                setRowShading(clonedRow, String(oddColor));
              } else if (evenColor && (index + 1) % 2 === 0) {
                setRowShading(clonedRow, String(evenColor));
              }

              const importedRow = doc.importNode(clonedRow, true);
              parent.insertBefore(importedRow, row);
            });

            // Remove original template row
            parent.removeChild(row);
          } else {
            // Remove row if empty
            row.parentNode?.removeChild(row);
          }
        }
      }
    }
  }

  private replaceRowPlaceholders(row: Element, context: any): void {
    const paragraphs = Array.from(row.getElementsByTagNameNS(W_NS, "p"));
    const placeholderRegex = /«([^»]+)»/g;

    for (const p of paragraphs) {
      const textNodes = Array.from(p.getElementsByTagNameNS(W_NS, "t"));
      if (textNodes.length === 0) continue;

      let combined = textNodes.map((t) => t.textContent || "").join("");
      combined = combined.replace(/«table\([^)]+\)»/gi, "").replace(/«endtable»/gi, "");

      if (placeholderRegex.test(combined)) {
        combined = combined.replace(placeholderRegex, (_, expr) => {
          const val = this.evaluateExpression(expr, context);
          return val != null ? String(val) : "";
        });

        textNodes[0].textContent = combined;
        for (let k = 1; k < textNodes.length; k++) {
          textNodes[k].textContent = "";
        }
      }
    }
  }

  private processLoops(doc: Document, data: any): void {
    const body = doc.getElementsByTagNameNS(W_NS, "body")[0];
    if (!body) return;
    this.processElementLoops(body, data, doc);
  }

  private processElementLoops(container: Element, data: any, doc: Document): void {
    const children = Array.from(container.childNodes);
    let i = 0;

    while (i < children.length) {
      const child = children[i];
      if (child.nodeType !== 1) {
        i++;
        continue;
      }

      const el = child as Element;
      const text = el.textContent || "";
      const loopMatch = text.match(/«loop\(([^)]+)\)»/i);

      if (loopMatch) {
        const loopPath = loopMatch[1].trim();
        const loopElements: Element[] = [];
        let depth = 1;
        let j = i + 1;

        while (j < children.length) {
          const nextChild = children[j];
          if (nextChild.nodeType === 1) {
            const nextEl = nextChild as Element;
            const nextText = nextEl.textContent || "";
            if (/«loop\(/i.test(nextText)) {
              depth++;
            }
            if (/«endloop»/i.test(nextText)) {
              depth--;
              if (depth === 0) {
                break;
              }
            }
            loopElements.push(nextEl);
          }
          j++;
        }

        const items = resolveToken(data, loopPath);
        const endLoopEl = j < children.length ? children[j] : null;

        if (Array.isArray(items) && items.length > 0) {
          for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
            const item = items[itemIdx];
            const itemContext = {
              ...(typeof item === "object" ? item : { item }),
              _index: itemIdx + 1,
              _first: itemIdx === 0,
              _last: itemIdx === items.length - 1,
              _even: (itemIdx + 1) % 2 === 0,
              _odd: (itemIdx + 1) % 2 !== 0
            };

            for (const loopEl of loopElements) {
              const elXml = serializeXml(loopEl);
              const elDoc = parseXml(elXml);
              const clonedEl = elDoc.documentElement;

              // Process inner loops recursively
              this.processElementLoops(clonedEl, itemContext, elDoc);

              // Replace fields inside this element with itemContext (handling split runs)
              const pList = clonedEl.localName === "p" || clonedEl.nodeName === "w:p" 
                ? [clonedEl] 
                : Array.from(clonedEl.getElementsByTagNameNS(W_NS, "p"));
              const placeholderRegex = /«([^»]+)»/g;

              for (const pEl of pList) {
                const textNodes = Array.from(pEl.getElementsByTagNameNS(W_NS, "t"));
                if (textNodes.length === 0) continue;
                const combined = textNodes.map((t) => t.textContent || "").join("");
                if (placeholderRegex.test(combined)) {
                  const evaluated = combined.replace(placeholderRegex, (_, expr) => {
                    const val = this.evaluateExpression(expr, itemContext);
                    return val != null ? String(val) : "";
                  });
                  textNodes[0].textContent = evaluated;
                  for (let k = 1; k < textNodes.length; k++) {
                    textNodes[k].textContent = "";
                  }
                }
              }

              const imported = doc.importNode(clonedEl, true);
              container.insertBefore(imported, el);
            }
          }
        }

        // Remove loop start, inner elements, and endloop
        container.removeChild(el);
        for (const loopEl of loopElements) {
          if (loopEl.parentNode === container) {
            container.removeChild(loopEl);
          }
        }
        if (endLoopEl && endLoopEl.parentNode === container) {
          container.removeChild(endLoopEl);
        }

        // Re-read children after DOM mutation
        return this.processElementLoops(container, data, doc);
      }

      i++;
    }
  }

  private evaluateExpression(expr: string, context: any): any {
    const parsed = parseExpression(expr);
    const rawVal = parsed.fieldPath ? resolveToken(context, parsed.fieldPath) : undefined;

    if (!parsed.funcName) {
      return rawVal;
    }

    const evaluator = this.evaluators.get(parsed.funcName);
    if (!evaluator) {
      return rawVal;
    }

    return evaluator.evaluate(rawVal, parsed.args);
  }

  private async applyWatermark(options: ExportOptions): Promise<void> {
    const headerFiles = this.zip.file(/^word\/header\d+\.xml$/);

    if (headerFiles.length > 0) {
      for (const hFile of headerFiles) {
        const xml = await hFile.async("string");
        const doc = parseXml(xml);
        const watermarkP = createWatermarkParagraph(
          doc,
          options.watermarkText!,
          options.watermarkColor,
          options.watermarkAngle,
          options.watermarkFontSize,
          options.watermarkFontName
        );

        doc.documentElement.insertBefore(watermarkP, doc.documentElement.firstChild);
        this.zip.file(hFile.name, serializeXml(doc));
      }
    } else {
      // Create new header1.xml
      const newHeaderXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="${W_NS}" xmlns:v="urn:schemas-microsoft-com:vml">
  <w:p>
    <w:pPr><w:pStyle w:val="Header"/></w:pPr>
    <w:r>
      <w:pict>
        <v:shape id="WordTemplaterWatermark" type="#_x0000_t136"
          style="position:absolute;left:0;text-align:left;margin-left:0;margin-top:0;width:412.5pt;height:247.5pt;rotation:${Math.round(
            options.watermarkAngle || -45
          )};z-index:-251654144;mso-position-horizontal:center;mso-position-horizontal-relative:margin;mso-position-vertical:center;mso-position-vertical-relative:margin"
          fillcolor="#${(options.watermarkColor || "C0C0C0").replace(/^#/, "")}" stroked="f">
          <v:fill opacity="0.3"/>
          <v:textpath style="font-family:'${options.watermarkFontName || "Calibri"}';font-size:${
        options.watermarkFontSize || 72
      }pt" string="${options.watermarkText}"/>
        </v:shape>
      </v:pict>
    </w:r>
  </w:p>
</w:hdr>`;
      this.zip.file("word/header1.xml", newHeaderXml);
    }
  }
}
