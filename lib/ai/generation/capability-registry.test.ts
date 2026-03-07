import {
  GENERATION_CAPABILITIES,
  findOrphanedGenerationSurfaces,
  getGenerationCapabilityById,
  getProductGenerationCapabilities,
  validateGenerationCapabilityRegistry,
} from "./capability-registry";

describe("generation capability registry", () => {
  it("contains canonical product workflows", () => {
    const productIds = getProductGenerationCapabilities().map((c) => c.id);
    expect(productIds).toEqual(
      expect.arrayContaining([
        "selection-skill-ai",
        "preset-generation",
        "preset-prompt-optimization",
        "prompt-self-optimization",
      ])
    );
  });

  it("passes built-in registry validation", () => {
    const errors = validateGenerationCapabilityRegistry();
    expect(errors).toEqual([]);
  });

  it("flags orphaned generation surfaces", () => {
    const orphans = findOrphanedGenerationSurfaces([
      "hook:useSkillAI.requestAI",
      "route:/api/generate-preset",
      "route:/api/unknown-generation",
    ]);

    expect(orphans).toEqual(["route:/api/unknown-generation"]);
  });

  it("classifies sequential export as non-product surface", () => {
    const sequential = getGenerationCapabilityById("sequential-helpers");
    expect(sequential).toBeDefined();
    expect(sequential?.exposure).not.toBe("product-wired");
  });

  it("detects duplicate capability ids", () => {
    const duplicate = [...GENERATION_CAPABILITIES, GENERATION_CAPABILITIES[0]];
    const errors = validateGenerationCapabilityRegistry(duplicate);

    expect(errors.some((e) => e.includes("Duplicate capability id"))).toBe(true);
  });
});

