import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { WordTemplate } from "../src/wordTemplate.js";

test("WordTemplate loads, populates with Data.json and exports docx properly", async () => {
  const templatePath = path.resolve("examples/templates/Template.docx");
  assert.ok(fs.existsSync(templatePath), "Template.docx should exist");

  const templateBuffer = fs.readFileSync(templatePath);
  const wordTemplate = await WordTemplate.load(templateBuffer);

  // Configure Watermark & Zebra striping
  wordTemplate.setWatermark("SAMPLE WATERMARK", "FF0000", -45, 60, "Arial");
  wordTemplate.enableTableZebraStriping("F0F0F0", "FFFFFF");

  const dataJson = JSON.parse(fs.readFileSync(path.resolve("examples/Data.json"), "utf8"));
  const outputBuffer = await wordTemplate.export(dataJson);

  assert.ok(outputBuffer.length > 0, "Output buffer should not be empty");

  // Verify that the output is a valid zip containing word/document.xml
  const zip = await JSZip.loadAsync(outputBuffer);
  const docXml = await zip.file("word/document.xml")?.async("string");
  assert.ok(docXml, "Exported docx must contain word/document.xml");

  // Verify exported docx contains rendered data from Data.json
  assert.ok(
    docXml.includes("Quy trình tiếp nhận") || docXml.includes("đăng ký"),
    "Exported docx should contain rendered content from Data.json"
  );
});

test("WordTemplate evaluates expressions, deep JSON and table repeating", async () => {
  // Construct a minimal in-memory docx package
  const zip = new JSZip();
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>«upper(Customer.Name)»</w:t></w:r></w:p>
    <w:p><w:r><w:t>«currency(Total, 'en-US')»</w:t></w:r></w:p>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:r><w:t>«table(Items, 'F0F0F0', 'FFFFFF')»«_index»</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>«Description»«endtable»</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`;

  zip.file("word/document.xml", documentXml);
  const docBuffer = await zip.generateAsync({ type: "nodebuffer" });

  const wordTemplate = await WordTemplate.load(docBuffer);
  const data = {
    Customer: { Name: "Acme Corporation" },
    Total: 2500,
    Items: [
      { Description: "Item One" },
      { Description: "Item Two" }
    ]
  };

  const outputBuffer = await wordTemplate.export(data);
  const outputZip = await JSZip.loadAsync(outputBuffer);
  const resultXml = await outputZip.file("word/document.xml")?.async("string");

  assert.ok(resultXml, "word/document.xml should exist");
  assert.ok(resultXml.includes("ACME CORPORATION"), "upper() evaluator should transform text");
  assert.ok(resultXml.includes("$2,500.00") || resultXml.includes("2,500"), "currency() evaluator should format number");
  assert.ok(resultXml.includes("Item One"), "Table row 1 should be generated");
  assert.ok(resultXml.includes("Item Two"), "Table row 2 should be generated");
});
