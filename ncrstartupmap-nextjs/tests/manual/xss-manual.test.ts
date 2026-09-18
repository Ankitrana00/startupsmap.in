// XSS Protection Test Script
// Run with: npx ts-node tests/xss-protections.test.ts

import { sanitizeUrl, sanitizeInput } from "../../src/lib/security/sanitize";

console.log("=== XSS Protection Tests ===\n");

// Test 1: URL Sanitization
console.log("Test 1: URL Sanitization");
const testUrls = [
  { input: "javascript:alert(1)", expected: "" },
  { input: "JaVaScRiPt:alert(1)", expected: "" },
  { input: "data:text/html,<script>alert(1)</script>", expected: "" },
  { input: "vbscript:alert(1)", expected: "" },
  { input: "https://example.com", expected: "https://example.com/" },
  { input: "http://example.com", expected: "http://example.com/" },
  { input: "", expected: "" },
  { input: "undefined", expected: "" },
];

let urlTestsPassed = 0;
for (const test of testUrls) {
  const result = sanitizeUrl(test.input);
  const passed = result === test.expected;
  if (passed) urlTestsPassed++;
  console.log(`  ${passed ? "✅" : "❌"} "${test.input}" → "${result}" (expected: "${test.expected}")`);
}
console.log(`URL Tests: ${urlTestsPassed}/${testUrls.length} passed\n`);

// Test 2: HTML Input Sanitization
console.log("Test 2: HTML Input Sanitization");
const testInputs = [
  { input: "<script>alert(1)</script>", expected: "&lt;script&gt;alert(1)&lt;/script&gt;" },
  { input: "<img src=x onerror=alert(1)>", expected: "&lt;img src=x onerror=alert(1)&gt;" },
  { input: "normal text", expected: "normal text" },
  { input: "", expected: "" },
];

let inputTestsPassed = 0;
for (const test of testInputs) {
  const result = sanitizeInput(test.input);
  const passed = result === test.expected;
  if (passed) inputTestsPassed++;
  console.log(`  ${passed ? "✅" : "❌"} "${test.input}" → "${result}"`);
}
console.log(`Input Tests: ${inputTestsPassed}/${testInputs.length} passed\n`);

// Summary
const totalPassed = urlTestsPassed + inputTestsPassed;
const totalTests = testUrls.length + testInputs.length;
console.log(`=== Summary: ${totalPassed}/${totalTests} tests passed ===`);

if (totalPassed === totalTests) {
  console.log("✅ All XSS protection tests passed!");
  process.exit(0);
} else {
  console.log("❌ Some XSS protection tests failed!");
  process.exit(1);
}
