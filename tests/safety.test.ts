import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyText, detectUrgent, enforceSteps, overallDifficulty } from "../src/lib/safety.ts";
import { clampEvidence, evidenceCeiling, rankSources } from "../src/lib/sources.ts";

test("safe filter cleaning stays user_safe", () => {
  assert.equal(classifyText("Clean the air filter according to the manual").risk, "user_safe");
});

test("refrigerant, live voltage, gas and brakes are professional", () => {
  assert.equal(classifyText("Recharge the refrigerant R410A").risk, "professional");
  assert.equal(classifyText("Measure the voltage on the live terminals with a multimeter").risk, "professional");
  assert.equal(classifyText("Check the gas valve and burner").risk, "professional");
  assert.equal(classifyText("Replace the brake pads and bleed the brake line").risk, "professional");
  assert.equal(classifyText("Bypass the thermostat to test").risk, "professional");
});

test("enforceSteps blocks a professional step even if the model said user_safe", () => {
  const [s] = enforceSteps([
    { title: "Test compressor", instructions: "Test the compressor capacitor with a multimeter", expected: "x", ifPass: "y", ifFail: "z", risk: "user_safe", warnings: [] },
  ]);
  assert.equal(s.blocked, true);
  assert.equal(s.risk, "professional");
  assert.match(s.instructions, /STOP/);
  assert.equal(s.expected, "");
});

test("overall difficulty rises with blocked steps", () => {
  assert.equal(overallDifficulty([{ risk: "user_safe" }], false), "user_safe");
  assert.equal(overallDifficulty([{ risk: "intermediate" }], false), "intermediate");
  assert.equal(overallDifficulty([{ risk: "user_safe" }], true), "professional");
});

test("urgent words trigger a stop-use warning", () => {
  assert.ok(detectUrgent("There is a burning smell from the unit"));
  assert.ok(detectUrgent("I got an electric shock"));
  assert.equal(detectUrgent("It blows warm air"), null);
});

test("source ranking and evidence ceiling", () => {
  const ranked = rankSources(
    [
      { title: "Random forum thread", url: "https://forum.example.com/t/1", snippet: "my AC is broken" },
      { title: "Panasonic CS-XU12 service manual PDF", url: "https://www.panasonic.com/docs/CS-XU12-service-manual.pdf", snippet: "CS-XU12 service" },
      { title: "Panasonic support", url: "https://www.panasonic.com/support", snippet: "help" },
    ],
    "Panasonic",
    "CS-XU12",
  );
  assert.equal(ranked[0].tier, "exact_service_manual");
  assert.equal(evidenceCeiling(ranked), "verified_exact");
  assert.equal(evidenceCeiling([]), "unverified");
  assert.equal(evidenceCeiling(rankSources([{ title: "x", url: "https://blog.example.com", snippet: "" }], "Panasonic", "A556")), "general");
  assert.equal(clampEvidence("verified_exact", "general"), "general");
  assert.equal(clampEvidence("general", "verified_exact"), "general");
});
