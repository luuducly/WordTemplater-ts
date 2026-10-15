import fs from "node:fs";
import path from "node:path";
import { WordTemplate } from "../src/index.js";

async function main() {
  const templatePath = path.resolve("examples/templates/Template.docx");
  const dataPath = path.resolve("examples/Data.json");
  const outputPath = path.resolve("examples/Output.docx");

  console.log("Loading template:", templatePath);
  const templateBuffer = fs.readFileSync(templatePath);
  const wordTemplate = await WordTemplate.load(templateBuffer);

  // Configure Watermark and Zebra Striping
  wordTemplate.setWatermark("CONFIDENTIAL", "C0C0C0", -45, 72, "Calibri");
  wordTemplate.enableTableZebraStriping("F9FAFB", "FFFFFF");

  const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  console.log("Exporting document with data...");

  const outputBuffer = await wordTemplate.export(data);
  fs.writeFileSync(outputPath, outputBuffer);

  console.log("Successfully generated:", outputPath);
  console.log("File size:", outputBuffer.length, "bytes");
}

main().catch(console.error);
