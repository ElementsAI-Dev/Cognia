## Why

Cognia currently supports core MCP tools/resources/prompts, but does not support MCP Apps UI extension (`io.modelcontextprotocol/ui`) and the `ui/*` bridge needed to render interactive app widgets. As more MCP servers ship app-first experiences, adding host-side MCP Apps support is necessary to avoid capability gaps and match modern client expectations.

## What Changes

- Add MCP Apps extension negotiation during MCP initialization so Cognia can advertise and detect UI capability.
- Extend MCP data models to preserve tool descriptor and tool result app metadata required by MCP Apps (including UI resource references and private widget metadata).
- Add a secure MCP App rendering runtime in Cognia desktop UI using sandboxed iframe and postMessage JSON-RPC bridge.
- Implement host-side `ui/*` message handling, including tool-result push, tool-input push, and UI-initiated `tools/call` proxying.
- Add guardrails for CSP/domain allowlisting and safe degradation when servers or clients do not support MCP Apps.

## Capabilities

### New Capabilities
- `mcp-apps-host`: Enable Cognia to negotiate MCP Apps support, render `text/html;profile=mcp-app` UI resources, and bridge UI-runtime interactions to MCP tools.
- `mcp-apps-security-policy`: Enforce sandbox, CSP/domain allowlists, and safe link/tool access boundaries for third-party MCP app widgets.

### Modified Capabilities
- *(none)*

## Impact

- Affected backend modules: `src-tauri/src/mcp/{client,types,protocol,manager}.rs`, Tauri MCP command surface.
- Affected frontend modules: MCP store/types, tool-result rendering components, new MCP App host UI components and bridge runtime.
- API/model impacts: richer MCP tool and tool-result payloads (metadata passthrough) and new UI event channel semantics.
- Security impacts: explicit iframe sandbox policy, CSP/domain validation, and restricted UI-initiated tool invocation path.
