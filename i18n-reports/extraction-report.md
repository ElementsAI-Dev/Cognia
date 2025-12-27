# i18n String Extraction Report

**Generated:** 2025-12-26T07:12:31.296Z

## Summary

- **Total Files Scanned:** 151
- **Files with i18n Hook:** 69
- **Files with Hardcoded Strings:** 121
- **Total Hardcoded Strings:** 1684

## By Namespace

| Namespace | Components | Strings |
|-----------|------------|--------|
| common | 121 | 1684 |

## Top Components with Hardcoded Strings

| Component | Namespace | Strings | Has i18n |
|-----------|-----------|---------|----------|
| [components/workflow-editor/node-config-panel.tsx](components/workflow-editor/node-config-panel.tsx) | common | 157 | ✅ |
| [components/settings/vector-manager.tsx](components/settings/vector-manager.tsx) | common | 53 | ❌ |
| [components/agent/workflow-selector.tsx](components/agent/workflow-selector.tsx) | common | 51 | ✅ |
| [components/settings/skill-settings.tsx](components/settings/skill-settings.tsx) | common | 42 | ❌ |
| [components/workflow-editor/workflow-toolbar.tsx](components/workflow-editor/workflow-toolbar.tsx) | common | 41 | ✅ |
| [components/settings/response-settings.tsx](components/settings/response-settings.tsx) | common | 39 | ✅ |
| [components/chat/quoted-content.tsx](components/chat/quoted-content.tsx) | common | 38 | ✅ |
| [components/export/animated-export-dialog.tsx](components/export/animated-export-dialog.tsx) | common | 37 | ❌ |
| [components/designer/designer-toolbar.tsx](components/designer/designer-toolbar.tsx) | common | 37 | ❌ |
| [components/agent/background-agent-panel.tsx](components/agent/background-agent-panel.tsx) | common | 36 | ✅ |
| [components/settings/provider-settings.tsx](components/settings/provider-settings.tsx) | common | 35 | ✅ |
| [components/projects/project-detail.tsx](components/projects/project-detail.tsx) | common | 33 | ❌ |
| [components/presets/create-preset-dialog.tsx](components/presets/create-preset-dialog.tsx) | common | 30 | ✅ |
| [components/designer/v0-designer.tsx](components/designer/v0-designer.tsx) | common | 29 | ❌ |
| [components/chat/image-generation-dialog.tsx](components/chat/image-generation-dialog.tsx) | common | 28 | ✅ |
| [components/canvas/canvas-panel.tsx](components/canvas/canvas-panel.tsx) | common | 28 | ❌ |
| [components/chat/renderers/code-block.tsx](components/chat/renderers/code-block.tsx) | common | 27 | ✅ |
| [components/chat/preset-manager-dialog.tsx](components/chat/preset-manager-dialog.tsx) | common | 26 | ✅ |
| [components/settings/mcp-server-dialog.tsx](components/settings/mcp-server-dialog.tsx) | common | 26 | ✅ |
| [components/chat/chat-header.tsx](components/chat/chat-header.tsx) | common | 25 | ✅ |
| [components/chat/chat-input.tsx](components/chat/chat-input.tsx) | common | 24 | ✅ |
| [components/settings/search-settings.tsx](components/settings/search-settings.tsx) | common | 23 | ✅ |
| [app/designer/page.tsx](app/designer/page.tsx) | common | 23 | ❌ |
| [components/chat/branch-selector.tsx](components/chat/branch-selector.tsx) | common | 22 | ❌ |
| [components/chat/renderers/mermaid-block.tsx](components/chat/renderers/mermaid-block.tsx) | common | 22 | ✅ |
| [components/projects/create-project-dialog.tsx](components/projects/create-project-dialog.tsx) | common | 22 | ✅ |
| [components/agent/agent-plan-editor.tsx](components/agent/agent-plan-editor.tsx) | common | 22 | ✅ |
| [components/chat/renderers/math-block.tsx](components/chat/renderers/math-block.tsx) | common | 21 | ✅ |
| [components/chat/renderers/enhanced-table.tsx](components/chat/renderers/enhanced-table.tsx) | common | 20 | ✅ |
| [components/designer/react-sandbox.tsx](components/designer/react-sandbox.tsx) | common | 20 | ❌ |
| [components/chat/renderers/vegalite-block.tsx](components/chat/renderers/vegalite-block.tsx) | common | 19 | ✅ |
| [components/settings/mcp-settings.tsx](components/settings/mcp-settings.tsx) | common | 19 | ❌ |
| [components/projects/knowledge-base.tsx](components/projects/knowledge-base.tsx) | common | 18 | ✅ |
| [components/artifacts/artifact-renderers.tsx](components/artifacts/artifact-renderers.tsx) | common | 17 | ✅ |
| [components/chat/chat-container.tsx](components/chat/chat-container.tsx) | common | 16 | ❌ |
| [components/settings/memory-settings.tsx](components/settings/memory-settings.tsx) | common | 16 | ✅ |
| [components/chat/chat-designer-panel.tsx](components/chat/chat-designer-panel.tsx) | common | 15 | ❌ |
| [components/settings/data-settings.tsx](components/settings/data-settings.tsx) | common | 15 | ❌ |
| [components/settings/setup-wizard.tsx](components/settings/setup-wizard.tsx) | common | 15 | ✅ |
| [components/export/document-export-dialog.tsx](components/export/document-export-dialog.tsx) | common | 15 | ✅ |
| [components/settings/appearance-settings.tsx](components/settings/appearance-settings.tsx) | common | 14 | ✅ |
| [components/settings/ollama-model-manager.tsx](components/settings/ollama-model-manager.tsx) | common | 14 | ✅ |
| [app/workflows/page.tsx](app/workflows/page.tsx) | common | 14 | ✅ |
| [components/settings/custom-provider-dialog.tsx](components/settings/custom-provider-dialog.tsx) | common | 13 | ✅ |
| [components/settings/vector-settings.tsx](components/settings/vector-settings.tsx) | common | 13 | ❌ |
| [components/agent/background-agent-indicator.tsx](components/agent/background-agent-indicator.tsx) | common | 12 | ❌ |
| [components/settings/speech-settings.tsx](components/settings/speech-settings.tsx) | common | 11 | ✅ |
| [components/settings/usage-settings.tsx](components/settings/usage-settings.tsx) | common | 11 | ❌ |
| [components/projects/project-list.tsx](components/projects/project-list.tsx) | common | 11 | ✅ |
| [components/agent/agent-mode-selector.tsx](components/agent/agent-mode-selector.tsx) | common | 11 | ✅ |

## Detailed Component Results

### components/workflow-editor/node-config-panel.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 157

*Showing first 20 of 157 strings*

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| outline | 139 | PropString | `common.outline` |
| ghost | 158 | PropString | `common.ghost` |
| icon | 159 | PropString | `common.icon` |
| properties | 193 | PropString | `common.properties` |
| inputs | 196 | PropString | `common.inputs` |
| outputs | 199 | PropString | `common.outputs` |
| properties | 206 | PropString | `common.properties` |
| label | 210 | PropString | `common.label` |
| label | 214 | PropString | `common.label` |
| description | 222 | PropString | `common.description` |
| description | 226 | PropString | `common.description` |
| inputs | 336 | PropString | `common.inputs` |
| input | 340 | PropString | `common.input` |
| outputs | 345 | PropString | `common.outputs` |
| output | 349 | PropString | `common.output` |
| GPT-4o (OpenAI) | 425 | JSXText | `common.gpt4o_openai` |
| gpt-4o | 425 | PropString | `common.gpt4o` |
| GPT-4o Mini (OpenAI) | 426 | JSXText | `common.gpt4o_mini_openai` |
| gpt-4o-mini | 426 | PropString | `common.gpt4omini` |
| o1 (OpenAI) | 427 | JSXText | `common.o1_openai` |

### components/settings/vector-manager.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 53

*Showing first 20 of 53 strings*

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| Collections & Search | 253 | JSXText | `common.collections_search` |
| Manage collections, clear data, and run vector searches. | 254 | JSXText | `common.manage_collections_clear_data_and_run_vector_searc` |
| Active collection | 259 | JSXText | `common.active_collection` |
| outline | 272 | PropString | `common.outline` |
| sm | 272 | PropString | `common.sm` |
| Create new collection | 278 | JSXText | `common.create_new_collection` |
|  setActionMessage(null)}>× | 296 | JSXText | `common._setactionmessagenull` |
| ghost | 296 | PropString | `common.ghost` |
| sm | 296 | PropString | `common.sm` |
| outline | 326 | PropString | `common.outline` |
| outline | 329 | PropString | `common.outline` |
| outline | 332 | PropString | `common.outline` |
| outline | 335 | PropString | `common.outline` |
| outline | 338 | PropString | `common.outline` |
| outline | 341 | PropString | `common.outline` |
| file | 346 | PropString | `common.file` |
| sm | 363 | PropString | `common.sm` |
| sm | 366 | PropString | `common.sm` |
| ghost | 366 | PropString | `common.ghost` |
| outline | 371 | PropString | `common.outline` |

### components/agent/workflow-selector.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 51

*Showing first 20 of 51 strings*

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| outline | 227 | PropString | `common.outline` |
| sm | 228 | PropString | `common.sm` |
| destructive | 244 | PropString | `common.destructive` |
| sm | 245 | PropString | `common.sm` |
| text-muted-foreground | 302 | PropString | `common.textmutedforeground` |
| outline | 337 | PropString | `common.outline` |
| secondary | 373 | PropString | `common.secondary` |
| outline | 377 | PropString | `common.outline` |
| basic | 462 | PropString | `common.basic` |
| basic | 464 | PropString | `common.basic` |
| templates | 465 | PropString | `common.templates` |
| advanced | 466 | PropString | `common.advanced` |
| basic | 469 | PropString | `common.basic` |
| topic | 471 | PropString | `common.topic` |
| topic | 473 | PropString | `common.topic` |
| description | 481 | PropString | `common.description` |
| description | 483 | PropString | `common.description` |
| slideCount | 493 | PropString | `common.slidecount` |
| slideCount | 495 | PropString | `common.slidecount` |
| style | 507 | PropString | `common.style` |

### components/settings/skill-settings.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 42

*Showing first 20 of 42 strings*

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| Built-in | 124 | JSXText | `common.builtin` |
| secondary | 124 | PropString | `common.secondary` |
| Active | 127 | JSXText | `common.active` |
| default | 127 | PropString | `common.default` |
| ghost | 157 | PropString | `common.ghost` |
| sm | 157 | PropString | `common.sm` |
| Category: | 168 | JSXText | `common.category` |
| Source: | 169 | JSXText | `common.source` |
| Version: | 170 | JSXText | `common.version` |
| Used: | 172 | JSXText | `common.used` |
| destructive | 176 | PropString | `common.destructive` |
| Validation Errors | 178 | JSXText | `common.validation_errors` |
| sm | 189 | PropString | `common.sm` |
| sm | 192 | PropString | `common.sm` |
| sm | 197 | PropString | `common.sm` |
| Create New Skill | 263 | JSXText | `common.create_new_skill` |
| Start Blank | 271 | JSXText | `common.start_blank` |
| blank | 271 | PropString | `common.blank` |
| Use Template | 272 | JSXText | `common.use_template` |
| template | 272 | PropString | `common.template` |

### components/workflow-editor/workflow-toolbar.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 41

*Showing first 20 of 41 strings*

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| ghost | 134 | PropString | `common.ghost` |
| icon | 135 | PropString | `common.icon` |
| ghost | 148 | PropString | `common.ghost` |
| icon | 148 | PropString | `common.icon` |
| start | 152 | PropString | `common.start` |
| vertical | 165 | PropString | `common.vertical` |
| ghost | 172 | PropString | `common.ghost` |
| icon | 173 | PropString | `common.icon` |
| ghost | 187 | PropString | `common.ghost` |
| icon | 188 | PropString | `common.icon` |
| vertical | 200 | PropString | `common.vertical` |
| ghost | 207 | PropString | `common.ghost` |
| icon | 208 | PropString | `common.icon` |
| ghost | 222 | PropString | `common.ghost` |
| icon | 223 | PropString | `common.icon` |
| vertical | 234 | PropString | `common.vertical` |
| ghost | 241 | PropString | `common.ghost` |
| icon | 242 | PropString | `common.icon` |
| ghost | 255 | PropString | `common.ghost` |
| icon | 256 | PropString | `common.icon` |

### components/settings/response-settings.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 39

*Showing first 20 of 39 strings*

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| Preview unavailable | 60 | JSXText | `common.preview_unavailable` |
| Preview: | 66 | JSXText | `common.preview` |
| line-numbers | 182 | PropString | `common.linenumbers` |
| line-numbers | 184 | PropString | `common.linenumbers` |
| syntax-highlight | 190 | PropString | `common.syntaxhighlight` |
| syntax-highlight | 192 | PropString | `common.syntaxhighlight` |
| code-word-wrap | 198 | PropString | `common.codewordwrap` |
| code-word-wrap | 200 | PropString | `common.codewordwrap` |
| LaTeX | 236 | JSXText | `common.latex` |
| math-rendering | 236 | PropString | `common.mathrendering` |
| math-rendering | 238 | PropString | `common.mathrendering` |
| Mermaid | 244 | JSXText | `common.mermaid` |
| mermaid-diagrams | 244 | PropString | `common.mermaiddiagrams` |
| mermaid-diagrams | 246 | PropString | `common.mermaiddiagrams` |
| VegaLite | 252 | JSXText | `common.vegalite` |
| vegalite-charts | 252 | PropString | `common.vegalitecharts` |
| vegalite-charts | 254 | PropString | `common.vegalitecharts` |
| center | 300 | PropString | `common.center` |
| left | 301 | PropString | `common.left` |
| math-copy-button | 307 | PropString | `common.mathcopybutton` |

### components/chat/quoted-content.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 38

*Showing first 20 of 38 strings*

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| icon | 143 | PropString | `common.icon` |
| ghost | 162 | PropString | `common.ghost` |
| icon | 163 | PropString | `common.icon` |
| ghost | 179 | PropString | `common.ghost` |
| icon | 180 | PropString | `common.icon` |
| ghost | 195 | PropString | `common.ghost` |
| icon | 196 | PropString | `common.icon` |
| ghost | 214 | PropString | `common.ghost` |
| icon | 214 | PropString | `common.icon` |
| end | 221 | PropString | `common.end` |
| ghost | 242 | PropString | `common.ghost` |
| icon | 242 | PropString | `common.icon` |
| end | 249 | PropString | `common.end` |
| ghost | 269 | PropString | `common.ghost` |
| icon | 270 | PropString | `common.icon` |
| ghost | 290 | PropString | `common.ghost` |
| ghost | 473 | PropString | `common.ghost` |
| ghost | 509 | PropString | `common.ghost` |
| icon | 510 | PropString | `common.icon` |
| Move up | 518 | JSXText | `common.move_up` |

### components/export/animated-export-dialog.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 37

*Showing first 20 of 37 strings*

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| outline | 212 | PropString | `common.outline` |
| sm | 212 | PropString | `common.sm` |
| Animated Chat Export | 220 | JSXText | `common.animated_chat_export` |
| preview | 226 | PropString | `common.preview` |
| Preview | 228 | JSXText | `common.preview` |
| preview | 228 | PropString | `common.preview` |
| settings | 229 | PropString | `common.settings` |
| preview | 235 | PropString | `common.preview` |
| outline | 245 | PropString | `common.outline` |
| icon | 246 | PropString | `common.icon` |
| outline | 255 | PropString | `common.outline` |
| icon | 255 | PropString | `common.icon` |
| icon | 266 | PropString | `common.icon` |
| icon | 274 | PropString | `common.icon` |
| icon | 282 | PropString | `common.icon` |
| settings | 330 | PropString | `common.settings` |
| Animation | 333 | JSXText | `common.animation` |
| Typing Speed | 337 | JSXText | `common.typing_speed` |
| Message Delay | 351 | JSXText | `common.message_delay` |
| Display | 366 | JSXText | `common.display` |

### components/designer/designer-toolbar.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 37

*Showing first 20 of 37 strings*

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| sm | 108 | PropString | `common.sm` |
| vertical | 121 | PropString | `common.vertical` |
| icon | 130 | PropString | `common.icon` |
| vertical | 142 | PropString | `common.vertical` |
| ghost | 149 | PropString | `common.ghost` |
| icon | 150 | PropString | `common.icon` |
| Zoom Out | 158 | JSXText | `common.zoom_out` |
| ghost | 168 | PropString | `common.ghost` |
| icon | 169 | PropString | `common.icon` |
| Zoom In | 177 | JSXText | `common.zoom_in` |
| ghost | 183 | PropString | `common.ghost` |
| icon | 184 | PropString | `common.icon` |
| Reset Zoom | 192 | JSXText | `common.reset_zoom` |
| vertical | 196 | PropString | `common.vertical` |
| ghost | 203 | PropString | `common.ghost` |
| icon | 204 | PropString | `common.icon` |
| Undo | 212 | JSXText | `common.undo` |
| ghost | 218 | PropString | `common.ghost` |
| icon | 219 | PropString | `common.icon` |
| Redo | 227 | JSXText | `common.redo` |

### components/agent/background-agent-panel.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 36

*Showing first 20 of 36 strings*

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| outline | 133 | PropString | `common.outline` |
| ghost | 178 | PropString | `common.ghost` |
| sm | 179 | PropString | `common.sm` |
| Start | 186 | JSXText | `common.start` |
| ghost | 194 | PropString | `common.ghost` |
| sm | 195 | PropString | `common.sm` |
| Pause | 202 | JSXText | `common.pause` |
| ghost | 210 | PropString | `common.ghost` |
| sm | 211 | PropString | `common.sm` |
| Resume | 218 | JSXText | `common.resume` |
| ghost | 226 | PropString | `common.ghost` |
| sm | 227 | PropString | `common.sm` |
| Cancel | 234 | JSXText | `common.cancel` |
| ghost | 242 | PropString | `common.ghost` |
| sm | 243 | PropString | `common.sm` |
| Delete | 250 | JSXText | `common.delete` |
| right | 294 | PropString | `common.right` |
| default | 301 | PropString | `common.default` |
| ghost | 311 | PropString | `common.ghost` |
| sm | 312 | PropString | `common.sm` |

### components/settings/provider-settings.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 35

*Showing first 20 of 35 strings*

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| outline | 324 | PropString | `common.outline` |
| Test Results: | 359 | JSXText | `common.test_results` |
| secondary | 454 | PropString | `common.secondary` |
| default | 457 | PropString | `common.default` |
| outline | 463 | PropString | `common.outline` |
| outline | 475 | PropString | `common.outline` |
| Configured | 485 | JSXText | `common.configured` |
| outline | 524 | PropString | `common.outline` |
| _blank | 557 | PropString | `common.blank` |
| button | 592 | PropString | `common.button` |
| ghost | 593 | PropString | `common.ghost` |
| icon | 594 | PropString | `common.icon` |
| outline | 607 | PropString | `common.outline` |
| _blank | 641 | PropString | `common.blank` |
| API Key Rotation | 660 | JSXText | `common.api_key_rotation` |
| outline | 661 | PropString | `common.outline` |
| Strategy: | 675 | JSXText | `common.strategy` |
| Round Robin | 687 | JSXText | `common.round_robin` |
| round-robin | 687 | PropString | `common.roundrobin` |
| Random | 688 | JSXText | `common.random` |

### components/projects/project-detail.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 33

*Showing first 20 of 33 strings*

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| Project not found | 120 | JSXText | `common.project_not_found` |
| outline | 121 | PropString | `common.outline` |
| ghost | 161 | PropString | `common.ghost` |
| icon | 161 | PropString | `common.icon` |
| outline | 187 | PropString | `common.outline` |
| secondary | 196 | PropString | `common.secondary` |
| outline | 208 | PropString | `common.outline` |
| outline | 215 | PropString | `common.outline` |
| outline | 220 | PropString | `common.outline` |
| outline | 225 | PropString | `common.outline` |
| Chat Sessions | 249 | JSXText | `common.chat_sessions` |
| Knowledge Files | 263 | JSXText | `common.knowledge_files` |
| Created | 277 | JSXText | `common.created` |
| Last Updated | 288 | JSXText | `common.last_updated` |
| Custom Instructions | 296 | JSXText | `common.custom_instructions` |
| secondary | 296 | PropString | `common.secondary` |
| outline | 299 | PropString | `common.outline` |
| outline | 302 | PropString | `common.outline` |
| sessions | 308 | PropString | `common.sessions` |
| sessions | 310 | PropString | `common.sessions` |

### components/presets/create-preset-dialog.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 30

*Showing first 20 of 30 strings*

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| basic | 407 | PropString | `common.basic` |
| basic | 409 | PropString | `common.basic` |
| model | 410 | PropString | `common.model` |
| prompt | 411 | PropString | `common.prompt` |
| quick | 412 | PropString | `common.quick` |
| basic | 415 | PropString | `common.basic` |
| name | 417 | PropString | `common.name` |
| name | 419 | PropString | `common.name` |
| description | 427 | PropString | `common.description` |
| description | 429 | PropString | `common.description` |
| button | 444 | PropString | `common.button` |
| button | 463 | PropString | `common.button` |
| model | 477 | PropString | `common.model` |
| chat | 485 | PropString | `common.chat` |
| agent | 486 | PropString | `common.agent` |
| research | 487 | PropString | `common.research` |
| auto | 500 | PropString | `common.auto` |
| maxTokens | 543 | PropString | `common.maxtokens` |
| maxTokens | 545 | PropString | `common.maxtokens` |
| number | 546 | PropString | `common.number` |

### components/designer/v0-designer.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 29

*Showing first 20 of 29 strings*

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
|  Promise | 77 | JSXText | `common._promise` |
| right | 231 | PropString | `common.right` |
| Designer | 242 | JSXText | `common.designer` |
| vertical | 245 | PropString | `common.vertical` |
| ghost | 252 | PropString | `common.ghost` |
| icon | 253 | PropString | `common.icon` |
| Undo | 261 | JSXText | `common.undo` |
| ghost | 267 | PropString | `common.ghost` |
| icon | 268 | PropString | `common.icon` |
| Redo | 276 | JSXText | `common.redo` |
| ghost | 287 | PropString | `common.ghost` |
| icon | 288 | PropString | `common.icon` |
| ghost | 300 | PropString | `common.ghost` |
| icon | 301 | PropString | `common.icon` |
| Download code | 308 | JSXText | `common.download_code` |
| vertical | 312 | PropString | `common.vertical` |
| outline | 316 | PropString | `common.outline` |
| outline | 328 | PropString | `common.outline` |
| Open in Canvas for detailed code editing | 336 | JSXText | `common.open_in_canvas_for_detailed_code_editing` |
| default | 351 | PropString | `common.default` |

### components/chat/image-generation-dialog.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 28

*Showing first 20 of 28 strings*

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| outline | 132 | PropString | `common.outline` |
| sm | 132 | PropString | `common.sm` |
| prompt | 152 | PropString | `common.prompt` |
| prompt | 154 | PropString | `common.prompt` |
| ghost | 166 | PropString | `common.ghost` |
| sm | 166 | PropString | `common.sm` |
| DALL-E 3 (Best quality) | 184 | JSXText | `common.dalle_3_best_quality` |
| dall-e-3 | 184 | PropString | `common.dalle3` |
| DALL-E 2 (Faster) | 185 | JSXText | `common.dalle_2_faster` |
| dall-e-2 | 185 | PropString | `common.dalle2` |
| Square (1024x1024) | 201 | JSXText | `common.square_1024x1024` |
| 1024x1024 | 201 | PropString | `common.1024x1024` |
| Portrait (1024x1792) | 202 | JSXText | `common.portrait_1024x1792` |
| 1024x1792 | 202 | PropString | `common.1024x1792` |
| Landscape (1792x1024) | 203 | JSXText | `common.landscape_1792x1024` |
| 1792x1024 | 203 | PropString | `common.1792x1024` |
| Standard | 219 | JSXText | `common.standard` |
| standard | 219 | PropString | `common.standard` |
| HD (Higher detail) | 220 | JSXText | `common.hd_higher_detail` |
| hd | 220 | PropString | `common.hd` |

### components/canvas/canvas-panel.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 28

*Showing first 20 of 28 strings*

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| right | 336 | PropString | `common.right` |
| secondary | 348 | PropString | `common.secondary` |
| outline | 352 | PropString | `common.outline` |
| ghost | 362 | PropString | `common.ghost` |
| icon | 363 | PropString | `common.icon` |
| Save version | 373 | JSXText | `common.save_version` |
| ghost | 380 | PropString | `common.ghost` |
| icon | 380 | PropString | `common.icon` |
| ghost | 392 | PropString | `common.ghost` |
| Preview | 398 | JSXText | `common.preview` |
| Open in Designer with live preview | 401 | JSXText | `common.open_in_designer_with_live_preview` |
| ghost | 406 | PropString | `common.ghost` |
| icon | 407 | PropString | `common.icon` |
| Open in Full Designer (new window) | 414 | JSXText | `common.open_in_full_designer_new_window` |
| ghost | 419 | PropString | `common.ghost` |
| icon | 419 | PropString | `common.icon` |
| ghost | 432 | PropString | `common.ghost` |
| ghost | 457 | PropString | `common.ghost` |
| end | 461 | PropString | `common.end` |
| Run Code | 478 | JSXText | `common.run_code` |

### components/chat/renderers/code-block.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 27

*Showing first 20 of 27 strings*

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| code | 100 | PropString | `common.code` |
|  : ''} | 139 | TemplateLiteral | `common._` |
| code | 146 | JSXText | `common.code` |
| font-mono | 146 | PropString | `common.fontmono` |
| ghost | 154 | PropString | `common.ghost` |
| icon | 155 | PropString | `common.icon` |
| ghost | 170 | PropString | `common.ghost` |
| icon | 171 | PropString | `common.icon` |
| ghost | 186 | PropString | `common.ghost` |
| icon | 187 | PropString | `common.icon` |
| Copy | 196 | JSXText | `common.copy` |
| ghost | 202 | PropString | `common.ghost` |
| icon | 203 | PropString | `common.icon` |
| Download | 211 | JSXText | `common.download` |
| ghost | 217 | PropString | `common.ghost` |
| icon | 218 | PropString | `common.icon` |
| Fullscreen | 226 | JSXText | `common.fullscreen` |
| ghost | 246 | PropString | `common.ghost` |
| icon | 247 | PropString | `common.icon` |
| ghost | 260 | PropString | `common.ghost` |

### components/chat/preset-manager-dialog.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 26

*Showing first 20 of 26 strings*

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| list | 371 | PropString | `common.list` |
| edit | 372 | PropString | `common.edit` |
| list | 378 | PropString | `common.list` |
| edit | 445 | PropString | `common.edit` |
| outline | 467 | PropString | `common.outline` |
| ghost | 542 | PropString | `common.ghost` |
| icon | 543 | PropString | `common.icon` |
| ghost | 553 | PropString | `common.ghost` |
| icon | 554 | PropString | `common.icon` |
| ghost | 564 | PropString | `common.ghost` |
| icon | 565 | PropString | `common.icon` |
| name | 614 | PropString | `common.name` |
| name | 616 | PropString | `common.name` |
| cursor-pointer | 636 | PropString | `common.cursorpointer` |
| description | 664 | PropString | `common.description` |
| description | 666 | PropString | `common.description` |
| auto | 689 | PropString | `common.auto` |
| gpt-4o | 704 | PropString | `common.gpt4o` |
| chat | 718 | PropString | `common.chat` |
| agent | 719 | PropString | `common.agent` |

### components/settings/mcp-server-dialog.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 26

*Showing first 20 of 26 strings*

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| server-name | 181 | PropString | `common.servername` |
| server-name | 183 | PropString | `common.servername` |
| stdio | 203 | PropString | `common.stdio` |
| sse | 204 | PropString | `common.sse` |
| command | 213 | PropString | `common.command` |
| command | 215 | PropString | `common.command` |
| outline | 238 | PropString | `common.outline` |
| icon | 239 | PropString | `common.icon` |
| button | 241 | PropString | `common.button` |
| button | 254 | PropString | `common.button` |
| sse-url | 267 | PropString | `common.sseurl` |
| sse-url | 269 | PropString | `common.sseurl` |
| outline | 295 | PropString | `common.outline` |
| icon | 296 | PropString | `common.icon` |
| button | 298 | PropString | `common.button` |
| ghost | 315 | PropString | `common.ghost` |
| icon | 316 | PropString | `common.icon` |
| button | 324 | PropString | `common.button` |
| ghost | 333 | PropString | `common.ghost` |
| icon | 334 | PropString | `common.icon` |

### components/chat/chat-header.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 25

*Showing first 20 of 25 strings*

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| vertical | 209 | PropString | `common.vertical` |
| ghost | 214 | PropString | `common.ghost` |
| sm | 214 | PropString | `common.sm` |
| start | 220 | PropString | `common.start` |
| vertical | 237 | PropString | `common.vertical` |
| vertical | 256 | PropString | `common.vertical` |
| outline | 259 | PropString | `common.outline` |
| vertical | 275 | PropString | `common.vertical` |
| /skills | 276 | PropString | `common.skills` |
| vertical | 283 | PropString | `common.vertical` |
| ghost | 301 | PropString | `common.ghost` |
| icon | 301 | PropString | `common.icon` |
| ghost | 313 | PropString | `common.ghost` |
| icon | 313 | PropString | `common.icon` |
| ghost | 323 | PropString | `common.ghost` |
| icon | 323 | PropString | `common.icon` |
| end | 327 | PropString | `common.end` |
| sm | 347 | PropString | `common.sm` |
| end | 354 | PropString | `common.end` |
| ghost | 386 | PropString | `common.ghost` |

### components/chat/chat-input.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 24

*Showing first 20 of 24 strings*

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| ghost | 718 | PropString | `common.ghost` |
| icon | 719 | PropString | `common.icon` |
| file | 754 | PropString | `common.file` |
| hidden | 756 | PropString | `common.hidden` |
| ghost | 770 | PropString | `common.ghost` |
| icon | 771 | PropString | `common.icon` |
| ghost | 810 | PropString | `common.ghost` |
| icon | 811 | PropString | `common.icon` |
| ghost | 830 | PropString | `common.ghost` |
| icon | 831 | PropString | `common.icon` |
| ghost | 877 | PropString | `common.ghost` |
| icon | 878 | PropString | `common.icon` |
| default | 897 | PropString | `common.default` |
| icon | 898 | PropString | `common.icon` |
| ghost | 922 | PropString | `common.ghost` |
| sm | 923 | PropString | `common.sm` |
| ghost | 941 | PropString | `common.ghost` |
| sm | 942 | PropString | `common.sm` |
| ghost | 961 | PropString | `common.ghost` |
| sm | 962 | PropString | `common.sm` |

### components/settings/search-settings.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 23

*Showing first 20 of 23 strings*

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| secondary | 207 | PropString | `common.secondary` |
| default | 237 | PropString | `common.default` |
| outline | 242 | PropString | `common.outline` |
| API Key | 272 | JSXText | `common.api_key` |
| button | 284 | PropString | `common.button` |
| ghost | 285 | PropString | `common.ghost` |
| icon | 286 | PropString | `common.icon` |
| outline | 298 | PropString | `common.outline` |
| _blank | 332 | PropString | `common.blank` |
| AI Answer | 344 | JSXText | `common.ai_answer` |
| secondary | 344 | PropString | `common.secondary` |
| News | 347 | JSXText | `common.news` |
| secondary | 347 | PropString | `common.secondary` |
| Images | 350 | JSXText | `common.images` |
| secondary | 350 | PropString | `common.secondary` |
| Academic | 353 | JSXText | `common.academic` |
| secondary | 353 | PropString | `common.secondary` |
| Recency Filter | 356 | JSXText | `common.recency_filter` |
| secondary | 356 | PropString | `common.secondary` |
| Domain Filter | 359 | JSXText | `common.domain_filter` |

### app/designer/page.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 23

*Showing first 20 of 23 strings*

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| sm | 193 | PropString | `common.sm` |
| Designer | 202 | JSXText | `common.designer` |
| icon | 211 | PropString | `common.icon` |
| icon | 220 | PropString | `common.icon` |
| icon | 233 | PropString | `common.icon` |
| icon | 241 | PropString | `common.icon` |
| outline | 249 | PropString | `common.outline` |
| sm | 249 | PropString | `common.sm` |
| outline | 254 | PropString | `common.outline` |
| sm | 255 | PropString | `common.sm` |
| Open in Canvas for detailed code editing with Monaco Editor | 257 | PropString | `common.open_in_canvas_for_detailed_code_editing_with_mona` |
| sm | 264 | PropString | `common.sm` |
| outline | 289 | PropString | `common.outline` |
| sm | 306 | PropString | `common.sm` |
| icon | 321 | PropString | `common.icon` |
| Choose a Template | 347 | JSXText | `common.choose_a_template` |
| sm | 359 | PropString | `common.sm` |
| all | 367 | PropString | `common.all` |
| All | 369 | JSXText | `common.all` |
| all | 369 | PropString | `common.all` |

### components/chat/branch-selector.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 22

*Showing first 20 of 22 strings*

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| ghost | 117 | PropString | `common.ghost` |
| sm | 117 | PropString | `common.sm` |
| secondary | 120 | PropString | `common.secondary` |
| outline | 127 | PropString | `common.outline` |
| sm | 127 | PropString | `common.sm` |
| end | 136 | PropString | `common.end` |
| Main | 149 | JSXText | `common.main` |
| default | 151 | PropString | `common.default` |
| ghost | 173 | PropString | `common.ghost` |
| icon | 174 | PropString | `common.icon` |
| ghost | 181 | PropString | `common.ghost` |
| icon | 182 | PropString | `common.icon` |
| default | 200 | PropString | `common.default` |
| ghost | 206 | PropString | `common.ghost` |
| icon | 207 | PropString | `common.icon` |
| ghost | 217 | PropString | `common.ghost` |
| icon | 218 | PropString | `common.icon` |
| Delete Branch | 245 | JSXText | `common.delete_branch` |
| Cancel | 253 | JSXText | `common.cancel` |
|  Promise | 273 | JSXText | `common._promise` |

### components/chat/renderers/mermaid-block.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 22

*Showing first 20 of 22 strings*

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| true | 148 | PropString | `common.true` |
| true | 164 | PropString | `common.true` |
| ghost | 171 | PropString | `common.ghost` |
| icon | 172 | PropString | `common.icon` |
| ghost | 185 | PropString | `common.ghost` |
| icon | 186 | PropString | `common.icon` |
| ghost | 219 | PropString | `common.ghost` |
| icon | 220 | PropString | `common.icon` |
| ghost | 235 | PropString | `common.ghost` |
| icon | 236 | PropString | `common.icon` |
| ghost | 253 | PropString | `common.ghost` |
| icon | 254 | PropString | `common.icon` |
| end | 265 | PropString | `common.end` |
| ghost | 280 | PropString | `common.ghost` |
| icon | 281 | PropString | `common.icon` |
| ghost | 318 | PropString | `common.ghost` |
| icon | 319 | PropString | `common.icon` |
| Copy source | 328 | JSXText | `common.copy_source` |
| ghost | 333 | PropString | `common.ghost` |
| icon | 334 | PropString | `common.icon` |

### components/projects/create-project-dialog.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 22

*Showing first 20 of 22 strings*

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| basic | 156 | PropString | `common.basic` |
| basic | 158 | PropString | `common.basic` |
| appearance | 159 | PropString | `common.appearance` |
| defaults | 160 | PropString | `common.defaults` |
| basic | 163 | PropString | `common.basic` |
| name | 165 | PropString | `common.name` |
| name | 167 | PropString | `common.name` |
| description | 175 | PropString | `common.description` |
| description | 177 | PropString | `common.description` |
| instructions | 186 | PropString | `common.instructions` |
| instructions | 188 | PropString | `common.instructions` |
| appearance | 213 | PropString | `common.appearance` |
| button | 237 | PropString | `common.button` |
| button | 259 | PropString | `common.button` |
| defaults | 278 | PropString | `common.defaults` |
| provider | 284 | PropString | `common.provider` |
| model | 302 | PropString | `common.model` |
| mode | 320 | PropString | `common.mode` |
| chat | 327 | PropString | `common.chat` |
| agent | 328 | PropString | `common.agent` |

### components/agent/agent-plan-editor.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 22

*Showing first 20 of 22 strings*

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| ghost | 132 | PropString | `common.ghost` |
| icon | 133 | PropString | `common.icon` |
| ghost | 141 | PropString | `common.ghost` |
| icon | 142 | PropString | `common.icon` |
| sm | 173 | PropString | `common.sm` |
| sm | 177 | PropString | `common.sm` |
| ghost | 177 | PropString | `common.ghost` |
| ghost | 217 | PropString | `common.ghost` |
| icon | 217 | PropString | `common.icon` |
| end | 221 | PropString | `common.end` |
|  : ''} | 360 | TemplateLiteral | `common._` |
| outline | 488 | PropString | `common.outline` |
| Progress | 531 | JSXText | `common.progress` |
| ghost | 544 | PropString | `common.ghost` |
| icon | 545 | PropString | `common.icon` |
| Refine with AI | 548 | PropString | `common.refine_with_ai` |
| sm | 603 | PropString | `common.sm` |
| sm | 608 | PropString | `common.sm` |
| ghost | 609 | PropString | `common.ghost` |
| outline | 622 | PropString | `common.outline` |

### components/chat/renderers/math-block.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 21

*Showing first 20 of 21 strings*

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| true | 132 | PropString | `common.true` |
| ghost | 139 | PropString | `common.ghost` |
| icon | 140 | PropString | `common.icon` |
| ghost | 153 | PropString | `common.ghost` |
| icon | 154 | PropString | `common.icon` |
| math | 181 | PropString | `common.math` |
| ghost | 189 | PropString | `common.ghost` |
| icon | 190 | PropString | `common.icon` |
| ghost | 205 | PropString | `common.ghost` |
| icon | 206 | PropString | `common.icon` |
| ghost | 223 | PropString | `common.ghost` |
| icon | 224 | PropString | `common.icon` |
| end | 235 | PropString | `common.end` |
| true | 237 | PropString | `common.true` |
| ghost | 250 | PropString | `common.ghost` |
| icon | 251 | PropString | `common.icon` |
| ghost | 289 | PropString | `common.ghost` |
| icon | 290 | PropString | `common.icon` |
| ghost | 304 | PropString | `common.ghost` |
| icon | 305 | PropString | `common.icon` |

### components/chat/renderers/enhanced-table.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 20

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| text | 290 | PropString | `common.text` |
| ghost | 306 | PropString | `common.ghost` |
| icon | 307 | PropString | `common.icon` |
| ghost | 324 | PropString | `common.ghost` |
| icon | 324 | PropString | `common.icon` |
| end | 331 | PropString | `common.end` |
| ghost | 357 | PropString | `common.ghost` |
| icon | 358 | PropString | `common.icon` |
| text-muted-foreground | 377 | PropString | `common.textmutedforeground` |
| ghost | 384 | PropString | `common.ghost` |
| icon | 385 | PropString | `common.icon` |
| ghost | 396 | PropString | `common.ghost` |
| icon | 397 | PropString | `common.icon` |
| text | 428 | PropString | `common.text` |
| outline | 441 | PropString | `common.outline` |
| outline | 445 | PropString | `common.outline` |
| outline | 449 | PropString | `common.outline` |
| text-muted-foreground | 464 | PropString | `common.textmutedforeground` |
| outline | 471 | PropString | `common.outline` |
| outline | 483 | PropString | `common.outline` |

### components/designer/react-sandbox.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 20

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| Start editing to see your changes live. | 275 | JSXText | `common.start_editing_to_see_your_changes_live` |
| horizontal | 380 | PropString | `common.horizontal` |
| vertical | 572 | PropString | `common.vertical` |
| icon | 581 | PropString | `common.icon` |
| vertical | 593 | PropString | `common.vertical` |
| ghost | 598 | PropString | `common.ghost` |
| icon | 598 | PropString | `common.icon` |
| Refresh Preview | 602 | JSXText | `common.refresh_preview` |
| icon | 609 | PropString | `common.icon` |
| File Explorer | 616 | JSXText | `common.file_explorer` |
| icon | 623 | PropString | `common.icon` |
| Console | 630 | JSXText | `common.console` |
| default | 640 | PropString | `common.default` |
| AI Edit | 642 | JSXText | `common.ai_edit` |
| text-xs | 642 | PropString | `common.textxs` |
| Edit with AI | 645 | JSXText | `common.edit_with_ai` |
| ghost | 652 | PropString | `common.ghost` |
| More | 653 | JSXText | `common.more` |
| text-xs | 653 | PropString | `common.textxs` |
| end | 657 | PropString | `common.end` |

### components/chat/renderers/vegalite-block.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 19

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| true | 177 | PropString | `common.true` |
| true | 193 | PropString | `common.true` |
| ghost | 200 | PropString | `common.ghost` |
| icon | 201 | PropString | `common.icon` |
| ghost | 214 | PropString | `common.ghost` |
| icon | 215 | PropString | `common.icon` |
| ghost | 248 | PropString | `common.ghost` |
| icon | 249 | PropString | `common.icon` |
| ghost | 264 | PropString | `common.ghost` |
| icon | 265 | PropString | `common.icon` |
| ghost | 282 | PropString | `common.ghost` |
| icon | 283 | PropString | `common.icon` |
| end | 294 | PropString | `common.end` |
| ghost | 309 | PropString | `common.ghost` |
| icon | 310 | PropString | `common.icon` |
| ghost | 346 | PropString | `common.ghost` |
| icon | 347 | PropString | `common.icon` |
| ghost | 361 | PropString | `common.ghost` |
| icon | 362 | PropString | `common.icon` |

### components/settings/mcp-settings.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 19

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| MCP Servers | 155 | JSXText | `common.mcp_servers` |
| Error | 166 | JSXText | `common.error` |
| ghost | 169 | PropString | `common.ghost` |
| sm | 169 | PropString | `common.sm` |
| outline | 179 | PropString | `common.outline` |
| outline | 188 | PropString | `common.outline` |
| ghost | 193 | PropString | `common.ghost` |
| icon | 194 | PropString | `common.icon` |
| No MCP Servers | 207 | JSXText | `common.no_mcp_servers` |
| outline | 217 | PropString | `common.outline` |
| outline | 234 | PropString | `common.outline` |
| outline | 274 | PropString | `common.outline` |
| sm | 275 | PropString | `common.sm` |
| outline | 287 | PropString | `common.outline` |
| sm | 288 | PropString | `common.sm` |
| ghost | 302 | PropString | `common.ghost` |
| icon | 303 | PropString | `common.icon` |
| ghost | 309 | PropString | `common.ghost` |
| icon | 310 | PropString | `common.icon` |

### components/projects/knowledge-base.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 18

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| file | 251 | PropString | `common.file` |
| outline | 258 | PropString | `common.outline` |
| sm | 259 | PropString | `common.sm` |
| sm | 270 | PropString | `common.sm` |
| secondary | 319 | PropString | `common.secondary` |
| ghost | 333 | PropString | `common.ghost` |
| icon | 334 | PropString | `common.icon` |
| ghost | 341 | PropString | `common.ghost` |
| icon | 342 | PropString | `common.icon` |
| ghost | 349 | PropString | `common.ghost` |
| icon | 350 | PropString | `common.icon` |
| filename | 384 | PropString | `common.filename` |
| filename | 386 | PropString | `common.filename` |
| content | 393 | PropString | `common.content` |
| content | 395 | PropString | `common.content` |
| outline | 404 | PropString | `common.outline` |
| secondary | 425 | PropString | `common.secondary` |
| outline | 437 | PropString | `common.outline` |

### components/artifacts/artifact-renderers.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 17

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| 3 3 | 198 | PropString | `common.3_3` |
| name | 199 | PropString | `common.name` |
| value | 214 | PropString | `common.value` |
| name | 215 | PropString | `common.name` |
| 50% | 216 | PropString | `common.50` |
| 50% | 217 | PropString | `common.50` |
| 3 3 | 233 | PropString | `common.3_3` |
| name | 234 | PropString | `common.name` |
| 3 3 | 254 | PropString | `common.3_3` |
| number | 255 | PropString | `common.number` |
| number | 256 | PropString | `common.number` |
| Data | 259 | PropString | `common.data` |
| 50% | 265 | PropString | `common.50` |
| 80% | 265 | PropString | `common.80` |
| name | 267 | PropString | `common.name` |
| 3 3 | 288 | PropString | `common.3_3` |
| name | 289 | PropString | `common.name` |

### components/chat/chat-container.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 16

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| assistant | 1077 | PropString | `common.assistant` |
| Thinking... | 1081 | JSXText | `common.thinking` |
| shadow-lg | 1240 | PropString | `common.shadowlg` |
| Open Learning Panel | 1259 | PropString | `common.open_learning_panel` |
| 20 | 1261 | PropString | `common.20` |
| 0 0 24 24 | 1261 | PropString | `common.0_0_24_24` |
| none | 1261 | PropString | `common.none` |
| currentColor | 1261 | PropString | `common.currentcolor` |
| round | 1261 | PropString | `common.round` |
| M22 10v6M2 10l10-5 10 5-10 5z | 1262 | PropString | `common.m22_10v6m2_10l105_10_510_5z` |
| M6 12v5c3 3 9 3 12 0v-5 | 1263 | PropString | `common.m6_12v5c3_3_9_3_12_0v5` |
|  Promise | 1342 | JSXText | `common._promise` |
| Edit message | 1515 | PropString | `common.edit_message` |
| Retry | 1524 | PropString | `common.retry` |
| Share | 1548 | PropString | `common.share` |
| Translate | 1554 | PropString | `common.translate` |

### components/settings/memory-settings.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 16

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| memory-enabled | 130 | PropString | `common.memoryenabled` |
| memory-enabled | 136 | PropString | `common.memoryenabled` |
| auto-infer | 144 | PropString | `common.autoinfer` |
| auto-infer | 150 | PropString | `common.autoinfer` |
| inject-prompt | 159 | PropString | `common.injectprompt` |
| inject-prompt | 165 | PropString | `common.injectprompt` |
| outline | 245 | PropString | `common.outline` |
| destructive | 258 | PropString | `common.destructive` |
| ghost | 377 | PropString | `common.ghost` |
| secondary | 398 | PropString | `common.secondary` |
| outline | 404 | PropString | `common.outline` |
| text-xs | 404 | PropString | `common.textxs` |
| icon | 424 | PropString | `common.icon` |
| ghost | 424 | PropString | `common.ghost` |
| icon | 428 | PropString | `common.icon` |
| ghost | 429 | PropString | `common.ghost` |

### components/chat/chat-designer-panel.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 15

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| secondary | 108 | PropString | `common.secondary` |
| icon | 119 | PropString | `common.icon` |
| AI Edit | 126 | JSXText | `common.ai_edit` |
| ghost | 132 | PropString | `common.ghost` |
| icon | 133 | PropString | `common.icon` |
| Edit in Canvas | 140 | JSXText | `common.edit_in_canvas` |
| ghost | 145 | PropString | `common.ghost` |
| icon | 146 | PropString | `common.icon` |
| Open Full Designer | 153 | JSXText | `common.open_full_designer` |
| ghost | 158 | PropString | `common.ghost` |
| icon | 159 | PropString | `common.icon` |
| ghost | 176 | PropString | `common.ghost` |
| icon | 177 | PropString | `common.icon` |
| Close | 184 | JSXText | `common.close` |
| ghost | 234 | PropString | `common.ghost` |

### components/settings/data-settings.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 15

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| Sessions | 209 | JSXText | `common.sessions` |
| Artifacts | 216 | JSXText | `common.artifacts` |
| LocalStorage | 221 | JSXText | `common.localstorage` |
| IndexedDB | 228 | JSXText | `common.indexeddb` |
| Usage | 234 | JSXText | `common.usage` |
| sm | 261 | PropString | `common.sm` |
| sm | 266 | PropString | `common.sm` |
| outline | 266 | PropString | `common.outline` |
| file | 271 | PropString | `common.file` |
| sm | 281 | PropString | `common.sm` |
| outline | 281 | PropString | `common.outline` |
| Data Privacy | 291 | JSXText | `common.data_privacy` |
| sm | 313 | PropString | `common.sm` |
| Are you absolutely sure? | 320 | JSXText | `common.are_you_absolutely_sure` |
| outline | 328 | PropString | `common.outline` |

### components/settings/setup-wizard.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 15

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| ollama-url | 455 | PropString | `common.ollamaurl` |
| ollama-url | 457 | PropString | `common.ollamaurl` |
| _blank | 466 | PropString | `common.blank` |
| api-key | 477 | PropString | `common.apikey` |
| api-key | 480 | PropString | `common.apikey` |
| button | 488 | PropString | `common.button` |
| icon | 490 | PropString | `common.icon` |
| _blank | 505 | PropString | `common.blank` |
| outline | 517 | PropString | `common.outline` |
| tavily-key | 576 | PropString | `common.tavilykey` |
| tavily-key | 579 | PropString | `common.tavilykey` |
| button | 587 | PropString | `common.button` |
| icon | 589 | PropString | `common.icon` |
| _blank | 604 | PropString | `common.blank` |
| destructive | 637 | PropString | `common.destructive` |

### components/export/document-export-dialog.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 15

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| outline | 214 | PropString | `common.outline` |
| sm | 214 | PropString | `common.sm` |
| format | 233 | PropString | `common.format` |
| format | 235 | PropString | `common.format` |
| options | 236 | PropString | `common.options` |
| format | 242 | PropString | `common.format` |
| outline | 285 | PropString | `common.outline` |
| options | 298 | PropString | `common.options` |
| include-metadata | 302 | PropString | `common.includemetadata` |
| include-metadata | 308 | PropString | `common.includemetadata` |
| include-timestamps | 318 | PropString | `common.includetimestamps` |
| include-timestamps | 324 | PropString | `common.includetimestamps` |
| include-tokens | 334 | PropString | `common.includetokens` |
| include-tokens | 340 | PropString | `common.includetokens` |
| outline | 379 | PropString | `common.outline` |

### components/settings/appearance-settings.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 14

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| outline | 238 | PropString | `common.outline` |
| UI Font Size | 256 | JSXText | `common.ui_font_size` |
| 12px | 278 | JSXText | `common.12px` |
| 16px | 279 | JSXText | `common.16px` |
| 20px | 280 | JSXText | `common.20px` |
| Preview Text | 287 | JSXText | `common.preview_text` |
| This is how text will appear in the interface. | 288 | JSXText | `common.this_is_how_text_will_appear_in_the_interface` |
| Message Style | 298 | JSXText | `common.message_style` |
| sidebar-collapsed | 341 | PropString | `common.sidebarcollapsed` |
| sidebar-collapsed | 347 | PropString | `common.sidebarcollapsed` |
| send-on-enter | 355 | PropString | `common.sendonenter` |
| send-on-enter | 361 | PropString | `common.sendonenter` |
| stream-responses | 369 | PropString | `common.streamresponses` |
| stream-responses | 375 | PropString | `common.streamresponses` |

### components/settings/ollama-model-manager.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 14

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| secondary | 153 | PropString | `common.secondary` |
| ghost | 213 | PropString | `common.ghost` |
| icon | 214 | PropString | `common.icon` |
| ghost | 272 | PropString | `common.ghost` |
| font-medium | 304 | PropString | `common.fontmedium` |
| ghost | 342 | PropString | `common.ghost` |
| icon | 343 | PropString | `common.icon` |
| outline | 395 | PropString | `common.outline` |
| default | 400 | PropString | `common.default` |
| ghost | 424 | PropString | `common.ghost` |
| icon | 425 | PropString | `common.icon` |
| Stop model | 432 | JSXText | `common.stop_model` |
| ghost | 439 | PropString | `common.ghost` |
| icon | 440 | PropString | `common.icon` |

### app/workflows/page.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 14

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| ghost | 221 | PropString | `common.ghost` |
| sm | 221 | PropString | `common.sm` |
| sm | 226 | PropString | `common.sm` |
| outline | 246 | PropString | `common.outline` |
| sm | 246 | PropString | `common.sm` |
| sm | 252 | PropString | `common.sm` |
| end | 257 | PropString | `common.end` |
| No workflows yet | 303 | JSXText | `common.no_workflows_yet` |
| Create your first workflow to get started | 304 | JSXText | `common.create_your_first_workflow_to_get_started` |
| ghost | 326 | PropString | `common.ghost` |
| end | 330 | PropString | `common.end` |
| secondary | 365 | PropString | `common.secondary` |
| outline | 369 | PropString | `common.outline` |
| Delete Workflow? | 391 | JSXText | `common.delete_workflow` |

### components/settings/custom-provider-dialog.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 13

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| provider-name | 172 | PropString | `common.providername` |
| provider-name | 174 | PropString | `common.providername` |
| base-url | 183 | PropString | `common.baseurl` |
| base-url | 185 | PropString | `common.baseurl` |
| api-key | 197 | PropString | `common.apikey` |
| api-key | 201 | PropString | `common.apikey` |
| button | 209 | PropString | `common.button` |
| icon | 211 | PropString | `common.icon` |
| outline | 223 | PropString | `common.outline` |
| outline | 257 | PropString | `common.outline` |
| icon | 257 | PropString | `common.icon` |
| outline | 310 | PropString | `common.outline` |
| outline | 328 | PropString | `common.outline` |

### components/settings/vector-settings.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 13

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| Vector Database | 56 | JSXText | `common.vector_database` |
| Configure provider, mode, and embedding defaults. | 57 | JSXText | `common.configure_provider_mode_and_embedding_defaults` |
| Provider | 62 | JSXText | `common.provider` |
| Mode | 81 | JSXText | `common.mode` |
| Embedded | 91 | JSXText | `common.embedded` |
| embedded | 91 | PropString | `common.embedded` |
| Server | 92 | JSXText | `common.server` |
| server | 92 | PropString | `common.server` |
| Chroma Server URL | 103 | JSXText | `common.chroma_server_url` |
| Chunk size | 118 | JSXText | `common.chunk_size` |
| Chunk overlap | 130 | JSXText | `common.chunk_overlap` |
| Auto embed on import | 145 | JSXText | `common.auto_embed_on_import` |
| Automatically generate embeddings when adding documents. | 146 | JSXText | `common.automatically_generate_embeddings_when_adding_docu` |

### components/agent/background-agent-indicator.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 12

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| ghost | 59 | PropString | `common.ghost` |
| sm | 60 | PropString | `common.sm` |
| end | 91 | PropString | `common.end` |
| Background Agents | 94 | JSXText | `common.background_agents` |
| ghost | 95 | PropString | `common.ghost` |
| sm | 95 | PropString | `common.sm` |
| Overall Progress | 103 | JSXText | `common.overall_progress` |
| Running | 115 | JSXText | `common.running` |
| Recently Completed | 146 | JSXText | `common.recently_completed` |
| text-[10px] | 170 | PropString | `common.text10px` |
| outline | 189 | PropString | `common.outline` |
| sm | 190 | PropString | `common.sm` |

### components/settings/speech-settings.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 11

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| destructive | 128 | PropString | `common.destructive` |
| system | 202 | PropString | `common.system` |
| 🌐 | 204 | JSXText | `common.` |
| openai | 208 | PropString | `common.openai` |
| 🤖 | 210 | JSXText | `common.` |
| OpenAI Whisper | 211 | JSXText | `common.openai_whisper` |
| outline | 213 | PropString | `common.outline` |
| destructive | 287 | PropString | `common.destructive` |
| secondary | 330 | PropString | `common.secondary` |
| outline | 421 | PropString | `common.outline` |
| secondary | 467 | PropString | `common.secondary` |

### components/settings/usage-settings.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 11

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| Tokens | 84 | JSXText | `common.tokens` |
| Cost | 92 | JSXText | `common.cost` |
| Since | 100 | JSXText | `common.since` |
| By Provider | 117 | JSXText | `common.by_provider` |
| secondary | 125 | PropString | `common.secondary` |
| Last 7 Days | 143 | JSXText | `common.last_7_days` |
| Recent Activity | 182 | JSXText | `common.recent_activity` |
| outline | 226 | PropString | `common.outline` |
| destructive | 232 | PropString | `common.destructive` |
| Clear Usage Records | 245 | JSXText | `common.clear_usage_records` |
| Cancel | 252 | JSXText | `common.cancel` |

### components/projects/project-list.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 11

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| Projects | 116 | JSXText | `common.projects` |
| Archived | 118 | JSXText | `common.archived` |
| secondary | 118 | PropString | `common.secondary` |
| outline | 123 | PropString | `common.outline` |
| sm | 124 | PropString | `common.sm` |
| outline | 131 | PropString | `common.outline` |
| sm | 132 | PropString | `common.sm` |
| end | 145 | PropString | `common.end` |
| Total Projects | 169 | JSXText | `common.total_projects` |
| Conversations | 180 | JSXText | `common.conversations` |
| Active Today | 191 | JSXText | `common.active_today` |

### components/agent/agent-mode-selector.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 11

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| outline | 112 | PropString | `common.outline` |
| sm | 113 | PropString | `common.sm` |
| start | 122 | PropString | `common.start` |
| secondary | 150 | PropString | `common.secondary` |
| name | 185 | PropString | `common.name` |
| name | 187 | PropString | `common.name` |
| description | 194 | PropString | `common.description` |
| description | 196 | PropString | `common.description` |
| prompt | 203 | PropString | `common.prompt` |
| prompt | 205 | PropString | `common.prompt` |
| outline | 214 | PropString | `common.outline` |

### components/canvas/version-history-panel.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 11

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| ghost | 139 | PropString | `common.ghost` |
| sm | 139 | PropString | `common.sm` |
| right | 145 | PropString | `common.right` |
| secondary | 243 | PropString | `common.secondary` |
| secondary | 334 | PropString | `common.secondary` |
| ghost | 350 | PropString | `common.ghost` |
| sm | 350 | PropString | `common.sm` |
| ghost | 355 | PropString | `common.ghost` |
| sm | 355 | PropString | `common.sm` |
| ghost | 361 | PropString | `common.ghost` |
| sm | 362 | PropString | `common.sm` |

### components/designer/designer-panel.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 11

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
|  Promise | 42 | JSXText | `common._promise` |
| right | 158 | PropString | `common.right` |
| ghost | 197 | PropString | `common.ghost` |
| 100% | 211 | PropString | `common.100` |
| typescript | 212 | PropString | `common.typescript` |
| vs-dark | 213 | PropString | `common.vsdark` |
| horizontal | 229 | PropString | `common.horizontal` |
| Elements | 236 | JSXText | `common.elements` |
| Styles | 257 | JSXText | `common.styles` |
| ghost | 270 | PropString | `common.ghost` |
| icon | 271 | PropString | `common.icon` |

### components/chat/template-selector.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 10

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| outline | 70 | PropString | `common.outline` |
| sm | 70 | PropString | `common.sm` |
| all | 108 | PropString | `common.all` |
| secondary | 179 | PropString | `common.secondary` |
| outline | 184 | PropString | `common.outline` |
| sm | 206 | PropString | `common.sm` |
| secondary | 253 | PropString | `common.secondary` |
| text-muted-foreground | 257 | PropString | `common.textmutedforeground` |
| outline | 293 | PropString | `common.outline` |
| outline | 296 | PropString | `common.outline` |

### components/chat/text-selection-popover.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 10

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| ghost | 159 | PropString | `common.ghost` |
| icon | 160 | PropString | `common.icon` |
| top | 171 | PropString | `common.top` |
| ghost | 179 | PropString | `common.ghost` |
| icon | 180 | PropString | `common.icon` |
| top | 191 | PropString | `common.top` |
| ghost | 200 | PropString | `common.ghost` |
| icon | 201 | PropString | `common.icon` |
| top | 208 | PropString | `common.top` |
| Search | 209 | JSXText | `common.search` |

### components/sidebar/app-sidebar.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 10

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| icon | 214 | PropString | `common.icon` |
| lg | 219 | PropString | `common.lg` |
| text | 240 | PropString | `common.text` |
| end | 280 | PropString | `common.end` |
| Projects | 402 | JSXText | `common.projects` |
| Designer | 410 | JSXText | `common.designer` |
| Skills | 418 | JSXText | `common.skills` |
| Workflows | 426 | JSXText | `common.workflows` |
| More | 578 | JSXText | `common.more` |
| start | 581 | PropString | `common.start` |

### components/agent/agent-flow-visualizer.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 10

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| outline | 112 | PropString | `common.outline` |
| ghost | 117 | PropString | `common.ghost` |
| sm | 117 | PropString | `common.sm` |
| Task: | 149 | JSXText | `common.task` |
| Result: | 155 | JSXText | `common.result` |
| Error: | 165 | JSXText | `common.error` |
| Recent Logs: | 172 | JSXText | `common.recent_logs` |
| Progress | 249 | JSXText | `common.progress` |
| ghost | 284 | PropString | `common.ghost` |
| ghost | 336 | PropString | `common.ghost` |

### app/splashscreen/page.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 10

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| 48 | 17 | PropString | `common.48` |
| 48 | 18 | PropString | `common.48` |
| 0 0 24 24 | 19 | PropString | `common.0_0_24_24` |
| none | 20 | PropString | `common.none` |
| currentColor | 21 | PropString | `common.currentcolor` |
| round | 23 | PropString | `common.round` |
| round | 24 | PropString | `common.round` |
| M12 2L2 7l10 5 10-5-10-5z | 27 | PropString | `common.m12_2l2_7l10_5_105105z` |
| M2 17l10 5 10-5 | 28 | PropString | `common.m2_17l10_5_105` |
| M2 12l10 5 10-5 | 29 | PropString | `common.m2_12l10_5_105` |

### components/chat/conversation-search.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 9

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
|  0 ? '...' : '') + context + (end  | 77 | JSXText | `common._0_context_end_` |
| icon | 127 | PropString | `common.icon` |
| ghost | 136 | PropString | `common.ghost` |
| icon | 137 | PropString | `common.icon` |
| ghost | 154 | PropString | `common.ghost` |
| icon | 155 | PropString | `common.icon` |
| ghost | 163 | PropString | `common.ghost` |
| icon | 164 | PropString | `common.icon` |
| outline | 191 | PropString | `common.outline` |

### components/sidebar/sidebar-container.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 9

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| Cognia | 46 | JSXText | `common.cognia` |
| ghost | 51 | PropString | `common.ghost` |
| New Chat | 57 | JSXText | `common.new_chat` |
| New Chat | 60 | JSXText | `common.new_chat` |
| right | 60 | PropString | `common.right` |
| ghost | 78 | PropString | `common.ghost` |
| icon | 79 | PropString | `common.icon` |
| ghost | 102 | PropString | `common.ghost` |
| icon | 103 | PropString | `common.icon` |

### components/projects/project-activity.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 9

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| ghost | 158 | PropString | `common.ghost` |
| sm | 158 | PropString | `common.sm` |
| Activity | 160 | JSXText | `common.activity` |
| right | 164 | PropString | `common.right` |
| outline | 173 | PropString | `common.outline` |
| sm | 173 | PropString | `common.sm` |
| secondary | 177 | PropString | `common.secondary` |
| end | 183 | PropString | `common.end` |
| secondary | 216 | PropString | `common.secondary` |

### components/artifacts/artifact-create-button.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 9

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| sm | 163 | PropString | `common.sm` |
| ghost | 163 | PropString | `common.ghost` |
| Create Artifact | 165 | JSXText | `common.create_artifact` |
| end | 169 | PropString | `common.end` |
| sm | 199 | PropString | `common.sm` |
| ghost | 200 | PropString | `common.ghost` |
| Create Artifact | 205 | JSXText | `common.create_artifact` |
| ghost | 217 | PropString | `common.ghost` |
| Create Artifact | 225 | JSXText | `common.create_artifact` |

### components/chat/batch-copy-dialog.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 8

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| ghost | 169 | PropString | `common.ghost` |
| text | 207 | PropString | `common.text` |
| text | 208 | PropString | `common.text` |
| markdown | 214 | PropString | `common.markdown` |
| markdown | 215 | PropString | `common.markdown` |
| json | 221 | PropString | `common.json` |
| json | 222 | PropString | `common.json` |
| outline | 232 | PropString | `common.outline` |

### components/chat/export-dialog.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 8

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| outline | 201 | PropString | `common.outline` |
| sm | 201 | PropString | `common.sm` |
| secondary | 240 | PropString | `common.secondary` |
| ghost | 257 | PropString | `common.ghost` |
| sm | 257 | PropString | `common.sm` |
| include-metadata | 267 | PropString | `common.includemetadata` |
| include-metadata | 273 | PropString | `common.includemetadata` |
| outline | 284 | PropString | `common.outline` |

### components/chat/recent-files-popover.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 8

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| ghost | 114 | PropString | `common.ghost` |
| icon | 115 | PropString | `common.icon` |
| start | 123 | PropString | `common.start` |
| ghost | 134 | PropString | `common.ghost` |
| icon | 135 | PropString | `common.icon` |
| ghost | 161 | PropString | `common.ghost` |
| icon | 162 | PropString | `common.icon` |
| ghost | 181 | PropString | `common.ghost` |

### components/settings/desktop-settings.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 8

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| outline | 94 | PropString | `common.outline` |
| secondary | 162 | PropString | `common.secondary` |
| outline | 166 | PropString | `common.outline` |
| outline | 255 | PropString | `common.outline` |
| default | 290 | PropString | `common.default` |
| outline | 320 | PropString | `common.outline` |
| ghost | 345 | PropString | `common.ghost` |
| ghost | 353 | PropString | `common.ghost` |

### components/projects/import-export-dialog.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 8

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| Import / Export Projects | 236 | JSXText | `common.import_export_projects` |
| export | 244 | PropString | `common.export` |
| import | 248 | PropString | `common.import` |
| export | 254 | PropString | `common.export` |
| ghost | 265 | PropString | `common.ghost` |
| import | 314 | PropString | `common.import` |
| file | 317 | PropString | `common.file` |
| Importing... | 332 | JSXText | `common.importing` |

### components/export/batch-export-dialog.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 8

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| outline | 159 | PropString | `common.outline` |
| Batch Export Sessions | 167 | JSXText | `common.batch_export_sessions` |
| Export Format | 176 | JSXText | `common.export_format` |
| ghost | 199 | PropString | `common.ghost` |
| ghost | 203 | PropString | `common.ghost` |
| Estimated size: | 233 | JSXText | `common.estimated_size` |
| outline | 247 | PropString | `common.outline` |
| outline | 292 | PropString | `common.outline` |

### components/designer/designer-preview.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 8

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| outline | 144 | PropString | `common.outline` |
| utf-8 | 311 | PropString | `common.utf8` |
| viewport | 312 | PropString | `common.viewport` |
| react | 326 | PropString | `common.react` |
| Error: | 341 | JSXText | `common.error` |
|  ' + error.message + ' | 341 | JSXText | `common._errormessage_` |
| utf-8 | 355 | PropString | `common.utf8` |
| viewport | 356 | PropString | `common.viewport` |

### components/chat/code-executor.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 7

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| outline | 111 | PropString | `common.outline` |
| secondary | 115 | PropString | `common.secondary` |
| ghost | 122 | PropString | `common.ghost` |
| icon | 123 | PropString | `common.icon` |
| ghost | 135 | PropString | `common.ghost` |
| icon | 136 | PropString | `common.icon` |
| Output | 162 | JSXText | `common.output` |

### components/chat/error-message.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 7

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| destructive | 196 | PropString | `common.destructive` |
| outline | 229 | PropString | `common.outline` |
| sm | 230 | PropString | `common.sm` |
| outline | 244 | PropString | `common.outline` |
| sm | 244 | PropString | `common.sm` |
| ghost | 262 | PropString | `common.ghost` |
| icon | 263 | PropString | `common.icon` |

### components/chat/prompt-optimizer-dialog.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 7

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| style | 233 | PropString | `common.style` |
| style | 235 | PropString | `common.style` |
| settings | 236 | PropString | `common.settings` |
| style | 239 | PropString | `common.style` |
| settings | 324 | PropString | `common.settings` |
| ghost | 392 | PropString | `common.ghost` |
| ghost | 395 | PropString | `common.ghost` |

### components/settings/chat-settings.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 7

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| openai | 88 | PropString | `common.openai` |
| auto-title | 250 | PropString | `common.autotitle` |
| auto-title | 256 | PropString | `common.autotitle` |
| show-model | 278 | PropString | `common.showmodel` |
| show-model | 284 | PropString | `common.showmodel` |
| markdown-render | 292 | PropString | `common.markdownrender` |
| markdown-render | 298 | PropString | `common.markdownrender` |

### components/settings/provider-import-export.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 7

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| outline | 168 | PropString | `common.outline` |
| sm | 169 | PropString | `common.sm` |
| outline | 178 | PropString | `common.outline` |
| sm | 179 | PropString | `common.sm` |
| file | 187 | PropString | `common.file` |
| outline | 227 | PropString | `common.outline` |
| outline | 289 | PropString | `common.outline` |

### components/projects/project-card.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 7

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| ghost | 143 | PropString | `common.ghost` |
| icon | 143 | PropString | `common.icon` |
| end | 147 | PropString | `common.end` |
| secondary | 236 | PropString | `common.secondary` |
| secondary | 242 | PropString | `common.secondary` |
| Delete Project | 262 | JSXText | `common.delete_project` |
| Cancel | 270 | JSXText | `common.cancel` |

### components/artifacts/artifact-preview.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 7

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| sm | 114 | PropString | `common.sm` |
| ghost | 114 | PropString | `common.ghost` |
| utf-8 | 158 | PropString | `common.utf8` |
| react | 171 | PropString | `common.react` |
| No component found. Export an App, Component, or Main function. | 187 | JSXText | `common.no_component_found_export_an_app_component_or_main` |
| Error: | 190 | JSXText | `common.error` |
|  ' + error.message + ' | 190 | JSXText | `common._errormessage_` |

### components/presets/preset-card.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 6

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| ghost | 91 | PropString | `common.ghost` |
| icon | 91 | PropString | `common.icon` |
| end | 95 | PropString | `common.end` |
| outline | 124 | PropString | `common.outline` |
| outline | 127 | PropString | `common.outline` |
| secondary | 131 | PropString | `common.secondary` |

### components/learning/learning-mode-panel.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 6

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| ghost | 112 | PropString | `common.ghost` |
| icon | 112 | PropString | `common.icon` |
| secondary | 182 | PropString | `common.secondary` |
| secondary | 211 | PropString | `common.secondary` |
| outline | 244 | PropString | `common.outline` |
| ghost | 254 | PropString | `common.ghost` |

### components/learning/learning-start-dialog.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 6

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| topic | 117 | PropString | `common.topic` |
| topic | 122 | PropString | `common.topic` |
| background | 131 | PropString | `common.background` |
| background | 138 | PropString | `common.background` |
| button | 185 | PropString | `common.button` |
| icon | 187 | PropString | `common.icon` |

### components/artifacts/artifact-panel.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 6

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| right | 229 | PropString | `common.right` |
| ghost | 247 | PropString | `common.ghost` |
| code | 268 | PropString | `common.code` |
| preview | 270 | PropString | `common.preview` |
| 100% | 320 | PropString | `common.100` |
| utf-8 | 394 | PropString | `common.utf8` |

### components/settings/keyboard-settings.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 5

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| Edit Shortcut | 93 | JSXText | `common.edit_shortcut` |
| secondary | 251 | PropString | `common.secondary` |
| ghost | 278 | PropString | `common.ghost` |
| icon | 279 | PropString | `common.icon` |
| destructive | 328 | PropString | `common.destructive` |

### components/settings/mcp-install-wizard.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 5

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| destructive | 175 | PropString | `common.destructive` |
| custom-args | 213 | PropString | `common.customargs` |
| custom-args | 215 | PropString | `common.customargs` |
| outline | 255 | PropString | `common.outline` |
| outline | 261 | PropString | `common.outline` |

### components/settings/theme-editor.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 5

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| theme-name | 168 | PropString | `common.themename` |
| theme-name | 170 | PropString | `common.themename` |
| outline | 306 | PropString | `common.outline` |
| ghost | 315 | PropString | `common.ghost` |
| outline | 325 | PropString | `common.outline` |

### components/sidebar/session-item.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 5

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| icon | 74 | PropString | `common.icon` |
| right | 81 | PropString | `common.right` |
| ghost | 118 | PropString | `common.ghost` |
| icon | 119 | PropString | `common.icon` |
| end | 126 | PropString | `common.end` |

### components/workflow-editor/execution-panel.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 5

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| outline | 129 | PropString | `common.outline` |
| outline | 140 | PropString | `common.outline` |
| destructive | 151 | PropString | `common.destructive` |
| outline | 164 | PropString | `common.outline` |
| outline | 212 | PropString | `common.outline` |

### components/workflow-editor/nodes/base-node.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 5

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| target | 124 | PropString | `common.target` |
| target | 133 | PropString | `common.target` |
| Not configured | 186 | JSXText | `common.not_configured` |
| source | 194 | PropString | `common.source` |
| source | 203 | PropString | `common.source` |

### components/artifacts/artifact-card.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 5

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| outline | 95 | PropString | `common.outline` |
| sm | 96 | PropString | `common.sm` |
| secondary | 141 | PropString | `common.secondary` |
| ghost | 166 | PropString | `common.ghost` |
| icon | 167 | PropString | `common.icon` |

### components/artifacts/artifact-list.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 5

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| No artifacts yet | 103 | JSXText | `common.no_artifacts_yet` |
| Code snippets and content will appear here | 104 | JSXText | `common.code_snippets_and_content_will_appear_here` |
| outline | 140 | PropString | `common.outline` |
| ghost | 207 | PropString | `common.ghost` |
| text-muted-foreground | 215 | PropString | `common.textmutedforeground` |

### app/settings/page.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 5

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| icon | 371 | PropString | `common.icon` |
| end | 375 | PropString | `common.end` |
| file | 385 | PropString | `common.file` |
| Reset All Settings? | 407 | JSXText | `common.reset_all_settings` |
| outline | 413 | PropString | `common.outline` |

### components/chat/renderers/math-inline.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 4

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| math | 86 | PropString | `common.math` |
| LaTeX Error | 94 | JSXText | `common.latex_error` |
| math | 114 | PropString | `common.math` |
| Click to copy | 137 | JSXText | `common.click_to_copy` |

### components/chat/tool-result-display.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 4

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| ghost | 89 | PropString | `common.ghost` |
| icon | 90 | PropString | `common.icon` |
| Tool result | 141 | PropString | `common.tool_result` |
| [Unknown content type] | 163 | JSXText | `common.unknown_content_type` |

### components/presets/preset-quick-prompts.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 4

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| ghost | 44 | PropString | `common.ghost` |
| sm | 45 | PropString | `common.sm` |
| Quick | 50 | JSXText | `common.quick` |
| Quick Prompts | 56 | JSXText | `common.quick_prompts` |

### components/presets/preset-selector.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 4

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| ghost | 80 | PropString | `common.ghost` |
| sm | 80 | PropString | `common.sm` |
| outline | 85 | PropString | `common.outline` |
| outline | 243 | PropString | `common.outline` |

### components/presets/presets-manager.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 4

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| outline | 275 | PropString | `common.outline` |
| end | 279 | PropString | `common.end` |
| file | 295 | PropString | `common.file` |
| outline | 302 | PropString | `common.outline` |

### components/chat/context-settings-dialog.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 3

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| (GPT-4o) | 85 | JSXText | `common.gpt4o` |
| (Fast) | 93 | JSXText | `common.fast` |
| 6/6 | 233 | JSXText | `common.66` |

### components/chat/mention-popover.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 3

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| ↑↓ | 214 | JSXText | `common.` |
| Enter | 217 | JSXText | `common.enter` |
| Esc | 220 | JSXText | `common.esc` |

### components/chat/session-stats.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 3

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| secondary | 147 | PropString | `common.secondary` |
| Messages | 214 | JSXText | `common.messages` |
| Est. Tokens | 224 | JSXText | `common.est_tokens` |

### components/settings/tool-settings.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 3

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| Tool Permissions | 151 | JSXText | `common.tool_permissions` |
| destructive | 205 | PropString | `common.destructive` |
| Desktop App Required | 207 | JSXText | `common.desktop_app_required` |

### components/projects/project-templates.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 3

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| Create from Template | 204 | JSXText | `common.create_from_template` |
| secondary | 258 | PropString | `common.secondary` |
| outline | 262 | PropString | `common.outline` |

### components/agent/tool-approval-dialog.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 3

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| outline | 105 | PropString | `common.outline` |
| json | 123 | PropString | `common.json` |
| outline | 147 | PropString | `common.outline` |

### components/workflow-editor/nodes/ai-node.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 3

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| secondary | 26 | PropString | `common.secondary` |
| outline | 31 | PropString | `common.outline` |
| outline | 36 | PropString | `common.outline` |

### components/designer/element-tree.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 3

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| No elements | 86 | JSXText | `common.no_elements` |
| ghost | 179 | PropString | `common.ghost` |
| icon | 180 | PropString | `common.icon` |

### components/chat/message-parts/sources-display.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 2

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| outline | 102 | PropString | `common.outline` |
| Web Search Answer | 191 | JSXText | `common.web_search_answer` |

### components/chat/message-reactions.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 2

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| ghost | 57 | PropString | `common.ghost` |
| icon | 58 | PropString | `common.icon` |

### components/chat/model-picker-dialog.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 2

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| default | 304 | PropString | `common.default` |
| • Free | 391 | JSXText | `common._free` |

### components/settings/provider-health-status.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 2

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| ghost | 164 | PropString | `common.ghost` |
|  75 && quotaPercentage  | 216 | JSXText | `common._75_quotapercentage_` |

### components/settings/ui-customization-settings.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 2

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| ghost | 89 | PropString | `common.ghost` |
| sm | 90 | PropString | `common.sm` |

### components/sidebar/session-list.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 2

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| No conversations yet | 28 | JSXText | `common.no_conversations_yet` |
| Start a new chat to begin | 29 | JSXText | `common.start_a_new_chat_to_begin` |

### components/agent/tool-timeline.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 2

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| Tool Executions | 122 | JSXText | `common.tool_executions` |
| Running... | 124 | JSXText | `common.running` |

### components/workflow-editor/nodes/conditional-node.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 2

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| ✓ True | 41 | JSXText | `common._true` |
| ✗ False | 42 | JSXText | `common._false` |

### components/workflow-editor/nodes/loop-node.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 2

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| secondary | 20 | PropString | `common.secondary` |
| outline | 23 | PropString | `common.outline` |

### components/workflow-editor/nodes/parallel-node.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 2

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| secondary | 33 | PropString | `common.secondary` |
| outline | 37 | PropString | `common.outline` |

### components/workflow-editor/workflow-editor-panel.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 2

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| Loading... | 177 | JSXText | `common.loading` |
| top-left | 230 | PropString | `common.topleft` |

### components/designer/style-panel.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 2

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| color | 198 | PropString | `common.color` |
| number | 245 | PropString | `common.number` |

### components/chat/markdown-renderer.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 1

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| lazy | 225 | PropString | `common.lazy` |

### components/chat/welcome-state.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 1

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| outline | 200 | PropString | `common.outline` |

### components/settings/custom-instructions-settings.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 1

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| outline | 186 | PropString | `common.outline` |

### components/settings/oauth-login-button.tsx

- **Namespace:** common
- **Has i18n Hook:** ✅ Yes
- **Hardcoded Strings:** 1

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| ghost | 152 | PropString | `common.ghost` |

### components/settings/quick-settings-card.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 1

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| outline | 104 | PropString | `common.outline` |

### components/agent/agent-steps.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 1

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| Progress | 35 | JSXText | `common.progress` |

### components/workflow-editor/nodes/tool-node.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 1

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| secondary | 19 | PropString | `common.secondary` |

### app/projects/page.tsx

- **Namespace:** common
- **Has i18n Hook:** ❌ No
- **Hardcoded Strings:** 1

| String | Line | Type | Suggested Key |
|--------|------|------|---------------|
| Projects | 72 | JSXText | `common.projects` |

