import { test } from "node:test";
import assert from "node:assert";
import { parseExpression, resolveToken } from "../src/utils.js";

test("resolveToken should navigate nested properties and array indices", () => {
  const data = {
    customer: {
      name: "Acme Corp",
      address: {
        city: "Mountain View",
        zip: 94043
      }
    },
    items: [
      { name: "Item 1", price: 100 },
      { name: "Item 2", price: 200 }
    ]
  };

  assert.strictEqual(resolveToken(data, "customer.name"), "Acme Corp");
  // Case-insensitive
  assert.strictEqual(resolveToken(data, "Customer.Address.City"), "Mountain View");
  assert.strictEqual(resolveToken(data, "customer.address.zip"), 94043);
  // Array index
  assert.strictEqual(resolveToken(data, "items[0].name"), "Item 1");
  assert.strictEqual(resolveToken(data, "items[1].price"), 200);
  // Non-existent
  assert.strictEqual(resolveToken(data, "customer.missing.field"), undefined);
});

test("parseExpression should parse function calls and direct fields", () => {
  const p1 = parseExpression("Customer.Name");
  assert.strictEqual(p1.funcName, "");
  assert.strictEqual(p1.fieldPath, "Customer.Name");

  const p2 = parseExpression("upper(Name)");
  assert.strictEqual(p2.funcName, "upper");
  assert.strictEqual(p2.fieldPath, "Name");

  const p3 = parseExpression("currency(Total, 'vi-VN')");
  assert.strictEqual(p3.funcName, "currency");
  assert.strictEqual(p3.fieldPath, "Total");
  assert.deepStrictEqual(p3.args, ["vi-VN"]);

  const p4 = parseExpression("table(Items, 'F9FAFB', 'FFFFFF')");
  assert.strictEqual(p4.funcName, "table");
  assert.strictEqual(p4.fieldPath, "Items");
  assert.deepStrictEqual(p4.args, ["F9FAFB", "FFFFFF"]);
});
