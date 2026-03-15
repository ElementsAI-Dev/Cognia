import { spawnSync } from "child_process";

function checkIgnore(pathname: string) {
  return spawnSync("git", ["check-ignore", "--no-index", "-v", pathname], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

describe(".gitignore source directory protection", () => {
  it.each([
    "components/artifacts/artifact-list.tsx",
    "hooks/artifacts/use-artifact-list.ts",
    "lib/artifacts/constants.ts",
  ])("does not ignore tracked source files under %s", (pathname) => {
    const result = checkIgnore(pathname);

    expect(result.status).toBe(1);
    expect(result.stdout.trim()).toBe("");
  });

  it("continues to ignore the generated root artifacts directory", () => {
    const result = checkIgnore("artifacts/generated-report.json");

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("artifacts/");
  });
});
