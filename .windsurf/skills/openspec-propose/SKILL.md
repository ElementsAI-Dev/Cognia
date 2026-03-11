---
name: openspec-propose
description: Propose a new change with all artifacts generated in one step. Use when the user wants to quickly describe what they want to build and get a complete proposal with design, specs, and tasks ready for implementation.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.2.0"
---

Propose a new change - create the change and generate all artifacts in one step.

I'll create a change with artifacts:
- proposal.md (what & why)
- design.md (how)
- tasks.md (implementation steps)

When ready to implement, run /opsx:apply

---

**Input**: The user's request should include a change name (kebab-case) OR a description of what they want to build.

**Steps**

1. **Resolve the change name**

   If no input is provided, use the **AskUserQuestion tool** (open-ended, no preset options):
   > "What change do you want to work on? Describe what you want to build or fix."

   Then resolve the name deterministically:
   - If input is already valid kebab-case, use it exactly
   - Otherwise derive kebab-case by:
     - lowercasing
     - replacing non-alphanumeric characters with `-`
     - collapsing repeated `-`
     - trimming leading/trailing `-`
   - Example: `"Add user authentication"` → `add-user-authentication`

   **IMPORTANT**: Do NOT proceed without understanding what the user wants to build.

2. **Handle existing change collisions (idempotent behavior)**

   If `openspec/changes/<name>/` already exists:
   - Ask whether to continue existing change or create a new name
   - If user chooses continue, reuse the existing directory and do NOT recreate completed artifacts
   - If user chooses new, derive a new kebab-case name and continue

3. **Create or reuse the change directory**

   If creating a new change:
   ```bash
   openspec new change "<name>"
   ```

   Validate scaffold creation by confirming both paths exist:
   - `openspec/changes/<name>/`
   - `openspec/changes/<name>/.openspec.yaml`

4. **Load status and dependency graph**

   ```bash
   openspec status --change "<name>" --json
   ```

   Parse:
   - `applyRequires`: artifact IDs required before implementation
   - `artifacts`: artifact list with readiness status (`ready`, `blocked`, `done`) and dependencies

5. **Generate artifacts in dependency order until apply-ready**

   Use the **TodoWrite tool** to track progress through artifacts.

   Loop:
   - Select only artifacts currently marked `ready`
   - For each ready artifact:
     1. Fetch instructions:
        ```bash
        openspec instructions <artifact-id> --change "<name>" --json
        ```
     2. Read all completed dependency artifact files listed in `dependencies` before writing
     3. Generate the artifact using `template` + `instruction` and apply `context`/`rules` as constraints
     4. Ensure standard artifact coverage:
        - `proposal` → `proposal.md`
        - `design` → `design.md`
        - `specs` → `specs/<capability>/spec.md`
        - `tasks` → `tasks.md` with checkbox format `- [ ] X.Y ...`
     5. Verify the output file exists on disk immediately after writing
     6. Show progress: `Created <artifact-id>`

   After each artifact write:
   - Re-run:
     ```bash
     openspec status --change "<name>" --json
     ```
   - Stop as soon as every artifact in `applyRequires` is `done`

   If no artifact is `ready` and apply-required artifacts are still incomplete:
   - Ask for clarification if context is missing
   - Otherwise report blocker and stop

6. **Show final status**
   ```bash
   openspec status --change "<name>"
   ```

**Output**

After completing all artifacts, summarize:
- Change name and location
- List of artifacts created (or reused) with brief descriptions
- What's ready: "All artifacts created! Ready for implementation."
- Prompt: "Run `/opsx:apply` to start implementing."

**Artifact Creation Guidelines**

- Follow the `instruction` field from `openspec instructions` for each artifact type
- The schema defines what each artifact should contain - follow it
- Read dependency artifacts for context before creating new ones
- Use `template` as the structure for your output file - fill in its sections
- **IMPORTANT**: `context` and `rules` are constraints for YOU, not content for the file
  - Do NOT copy `<context>`, `<rules>`, `<project_context>` blocks into the artifact
  - These guide what you write, but should never appear in the output

**Guardrails**
- Create ALL artifacts needed for implementation (as defined by schema's `apply.requires`)
- Always read dependency artifacts before creating a new one
- If context is critically unclear, ask the user - but prefer making reasonable decisions to keep momentum
- If a change with that name already exists, ask if user wants to continue it or create a new one
- Verify each artifact file exists after writing before proceeding to next
