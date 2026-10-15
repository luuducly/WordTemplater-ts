import { test } from "node:test";
import assert from "node:assert";
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
} from "../src/evaluators.js";

test("String evaluators work properly", () => {
  const upper = new UpperEvaluator();
  assert.strictEqual(upper.evaluate("hello world"), "HELLO WORLD");

  const lower = new LowerEvaluator();
  assert.strictEqual(lower.evaluate("HELLO WORLD"), "hello world");

  const trim = new TrimEvaluator();
  assert.strictEqual(trim.evaluate("  test  "), "test");

  const sub = new SubEvaluator();
  assert.strictEqual(sub.evaluate("WORDTEMPLATER", [0, 4]), "WORD");

  const left = new LeftEvaluator();
  assert.strictEqual(left.evaluate("INV-1234", [3]), "INV");

  const right = new RightEvaluator();
  assert.strictEqual(right.evaluate("INV-1234", [4]), "1234");

  const replace = new ReplaceEvaluator();
  assert.strictEqual(replace.evaluate("2026-10-15", ["-", "/"]), "2026/10/15");

  const padLeft = new PadLeftEvaluator();
  assert.strictEqual(padLeft.evaluate(42, [5, "0"]), "00042");

  const padRight = new PadRightEvaluator();
  assert.strictEqual(padRight.evaluate("A1", [6, "_"]), "A1____");
});

test("Number and Currency evaluators work properly", () => {
  const currency = new CurrencyEvaluator();
  const usRes = currency.evaluate(1500, ["en-US"]);
  assert.ok(usRes.includes("1,500") || usRes.includes("$"));

  const number = new NumberEvaluator();
  const numRes = number.evaluate(1234567, ["", "en-US"]);
  assert.strictEqual(numRes, "1,234,567");

  const pct = new PercentageEvaluator();
  assert.strictEqual(pct.evaluate(0.85), "85.00%");
});

test("Date, Default, and If evaluators work properly", () => {
  const dateEval = new DateEvaluator();
  const dRes = dateEval.evaluate("2026-10-15T00:00:00", ["dd/MM/yyyy"]);
  assert.strictEqual(dRes, "15/10/2026");

  const defEval = new DefaultValueEvaluator();
  assert.strictEqual(defEval.evaluate(null, ["N/A"]), "N/A");
  assert.strictEqual(defEval.evaluate("", ["Fallback"]), "Fallback");
  assert.strictEqual(defEval.evaluate("Valid", ["Fallback"]), "Valid");

  const ifEval = new IfEvaluator();
  assert.strictEqual(ifEval.evaluate(true, ["Yes", "No"]), "Yes");
  assert.strictEqual(ifEval.evaluate(false, ["Yes", "No"]), "No");
});
