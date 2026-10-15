import { DOMParser, XMLSerializer } from "@xmldom/xmldom";

export const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
export const R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
export const V_NS = "urn:schemas-microsoft-com:vml";

export function parseXml(xmlString: string): Document {
  return new DOMParser().parseFromString(xmlString, "text/xml");
}

export function serializeXml(doc: Document | Node): string {
  return new XMLSerializer().serializeToString(doc);
}

/**
 * Escapes XML special characters
 */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Sets background shading on all cells of a table row
 */
export function setRowShading(rowNode: Element, fillColorHex: string): void {
  const cleanColor = fillColorHex.replace(/^#/, "");
  const doc = rowNode.ownerDocument;
  if (!doc) return;

  const cells = rowNode.getElementsByTagNameNS(W_NS, "tc");
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    let tcPr = getFirstDirectChild(cell, "tcPr");
    if (!tcPr) {
      tcPr = doc.createElementNS(W_NS, "w:tcPr");
      cell.insertBefore(tcPr, cell.firstChild);
    }

    let shd = getFirstDirectChild(tcPr, "shd");
    if (!shd) {
      shd = doc.createElementNS(W_NS, "w:shd");
      tcPr.appendChild(shd);
    }

    shd.setAttributeNS(W_NS, "w:val", "clear");
    shd.setAttributeNS(W_NS, "w:color", "auto");
    shd.setAttributeNS(W_NS, "w:fill", cleanColor);
  }
}

/**
 * Generates VML watermark paragraph node
 */
export function createWatermarkParagraph(
  doc: Document,
  text: string,
  color: string = "C0C0C0",
  angle: number = -45,
  fontSize: number = 72,
  fontName: string = "Calibri"
): Element {
  const cleanColor = color.replace(/^#/, "");
  const escaped = escapeXml(text);
  const p = doc.createElementNS(W_NS, "w:p");

  p.innerHTML = `
    <w:pPr xmlns:w="${W_NS}"><w:pStyle w:val="Header"/></w:pPr>
    <w:r xmlns:w="${W_NS}" xmlns:v="${V_NS}">
      <w:rPr><w:noProof/></w:rPr>
      <w:pict>
        <v:shapetype id="_x0000_t136" coordsize="21600,21600" path="m@7,l@8,m@5,21600l@6,21600e">
          <v:textpath on="t" fitshape="t"/>
          <v:path textpathok="t"/>
        </v:shapetype>
        <v:shape id="WordTemplaterWatermark" type="#_x0000_t136"
          style="position:absolute;left:0;text-align:left;margin-left:0;margin-top:0;width:412.5pt;height:247.5pt;rotation:${Math.round(
            angle
          )};z-index:-251654144;mso-position-horizontal:center;mso-position-horizontal-relative:margin;mso-position-vertical:center;mso-position-vertical-relative:margin"
          fillcolor="#${cleanColor}" stroked="f">
          <v:fill opacity="0.3"/>
          <v:textpath style="font-family:'${fontName}';font-size:${fontSize}pt" string="${escaped}"/>
        </v:shape>
      </v:pict>
    </w:r>
  `;

  return p;
}

export function getFirstDirectChild(parent: Element, tagName: string): Element | null {
  for (let i = 0; i < parent.childNodes.length; i++) {
    const child = parent.childNodes[i];
    if (child.nodeType === 1) {
      const el = child as Element;
      if (el.localName === tagName || el.nodeName === tagName || el.nodeName === `w:${tagName}`) {
        return el;
      }
    }
  }
  return null;
}
