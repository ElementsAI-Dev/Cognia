# Tasks: A2UI Integration

**Input**: Design documents from `/specs/master/`
**Prerequisites**: plan.md (required), spec.md (required)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (A2UI Infrastructure)

**Purpose**: Create A2UI protocol types, parser, and core utilities

- [ ] T001 Create A2UI TypeScript type definitions in types/a2ui.ts
- [ ] T002 [P] Create A2UI message parser in lib/a2ui/parser.ts
- [ ] T003 [P] Create JSON Pointer data binding utilities in lib/a2ui/data-model.ts
- [ ] T004 [P] Create component catalog registry in lib/a2ui/catalog.ts
- [ ] T005 [P] Create user action event types and handlers in lib/a2ui/events.ts
- [ ] T006 Create A2UI library index exports in lib/a2ui/index.ts
- [ ] T007 [P] Create A2UI Zustand store in stores/a2ui-store.ts
- [ ] T008 Install json-pointer package for RFC 6901 path resolution

---

## Phase 2: Foundational (A2UI React Components)

**Purpose**: Create the A2UI renderer and context infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T009 Create A2UI React context provider in components/a2ui/a2ui-context.tsx
- [ ] T010 Create A2UI surface container component in components/a2ui/a2ui-surface.tsx
- [ ] T011 Create A2UI component tree renderer in components/a2ui/a2ui-renderer.tsx
- [ ] T012 [P] Create A2UI fallback component for unknown types in components/a2ui/components/a2ui-fallback.tsx
- [ ] T013 [P] Create A2UI Text component mapping in components/a2ui/components/a2ui-text.tsx
- [ ] T014 [P] Create A2UI Row layout component in components/a2ui/components/a2ui-row.tsx
- [ ] T015 [P] Create A2UI Column layout component in components/a2ui/components/a2ui-column.tsx
- [ ] T016 Create A2UI components index exports in components/a2ui/index.ts
- [ ] T017 Create useA2UI hook for surface management in hooks/use-a2ui.ts
- [ ] T018 Create useA2UIDataModel hook for data binding in hooks/use-a2ui-data-model.ts

**Checkpoint**: A2UI foundation ready - can render basic Text in Row/Column layouts

---

## Phase 3: User Story 1 - AI-Generated Interactive Forms (Priority: P1) 🎯 MVP

**Goal**: Enable AI to generate interactive forms with input components instead of text-based Q&A

**Independent Test**: Ask AI to book something → form renders with inputs → submit sends structured data back

### Implementation for User Story 1

- [ ] T019 [P] [US1] Create A2UI Button component in components/a2ui/components/a2ui-button.tsx
- [ ] T020 [P] [US1] Create A2UI TextField component in components/a2ui/components/a2ui-textfield.tsx
- [ ] T021 [P] [US1] Create A2UI Select/Dropdown component in components/a2ui/components/a2ui-select.tsx
- [ ] T022 [P] [US1] Create A2UI Checkbox component in components/a2ui/components/a2ui-checkbox.tsx
- [ ] T023 [P] [US1] Create A2UI Radio component in components/a2ui/components/a2ui-radio.tsx
- [ ] T024 [P] [US1] Create A2UI DatePicker component in components/a2ui/components/a2ui-datepicker.tsx
- [ ] T025 [P] [US1] Create A2UI Slider component in components/a2ui/components/a2ui-slider.tsx
- [ ] T026 [US1] Create A2UI Card container component in components/a2ui/components/a2ui-card.tsx
- [ ] T027 [US1] Implement two-way data binding for form inputs in lib/a2ui/data-model.ts
- [ ] T028 [US1] Implement userAction event emission for form submissions in lib/a2ui/events.ts
- [ ] T029 [US1] Create A2UI message part renderer in components/chat/message-parts/a2ui-part.tsx
- [ ] T030 [US1] Integrate A2UI detection in chat message rendering in components/chat/chat-container.tsx
- [ ] T031 [US1] Add A2UI surface state management to message store for persistence
- [ ] T032 [US1] Create form submission handler that sends structured data to AI conversation

**Checkpoint**: AI can generate forms, user can fill and submit, AI receives structured data

---

## Phase 4: User Story 2 - Dynamic Data Visualization (Priority: P2)

**Goal**: Enable AI to generate interactive charts and tables with reactive data binding

**Independent Test**: Ask AI for data analysis → chart/table renders → data updates reflect in UI

### Implementation for User Story 2

- [ ] T033 [P] [US2] Create A2UI Chart component with Recharts integration in components/a2ui/components/a2ui-chart.tsx
- [ ] T034 [P] [US2] Create A2UI Table component with sorting/filtering in components/a2ui/components/a2ui-table.tsx
- [ ] T035 [P] [US2] Create A2UI Image component in components/a2ui/components/a2ui-image.tsx
- [ ] T036 [US2] Create A2UI List component with template rendering in components/a2ui/components/a2ui-list.tsx
- [ ] T037 [US2] Implement reactive data binding updates in A2UI store in stores/a2ui-store.ts
- [ ] T038 [US2] Add dataModelUpdate message handling for streaming updates in lib/a2ui/parser.ts
- [ ] T039 [US2] Add chart interactivity handlers (tooltips, click events) in components/a2ui/components/a2ui-chart.tsx
- [ ] T040 [US2] Add table local state for sorting/filtering without AI round-trip

**Checkpoint**: AI generates charts/tables, data updates reactively, local interactions work

---

## Phase 5: User Story 3 - Agent Tool Output Rendering (Priority: P2)

**Goal**: Render agent tool outputs as rich A2UI components instead of raw JSON

**Independent Test**: Agent runs search tool → results render as cards with images → clickable interactions

### Implementation for User Story 3

- [ ] T041 [US3] Create A2UI tool output detector in lib/a2ui/parser.ts
- [ ] T042 [US3] Integrate A2UI rendering in ToolTimeline component in components/agent/tool-timeline.tsx
- [ ] T043 [US3] Create tool result → A2UI surface transformer in lib/a2ui/tool-transformer.ts
- [ ] T044 [US3] Add A2UI preview in tool approval dialog in components/agent/tool-approval-dialog.tsx
- [ ] T045 [US3] Create common tool output templates (search results, file lists, API responses) in lib/a2ui/templates/
- [ ] T046 [US3] Add A2UI surface to BackgroundAgentPanel result preview in components/agent/background-agent-panel.tsx

**Checkpoint**: Agent tool outputs render as rich UI cards/lists/tables

---

## Phase 6: User Story 4 - Custom Component Catalog (Priority: P3)

**Goal**: Allow defining custom A2UI components that map to existing shadcn/ui components

**Independent Test**: Define custom ProductCard → AI uses it → renders with shadcn styling

### Implementation for User Story 4

- [ ] T047 [US4] Create custom component registration API in lib/a2ui/catalog.ts
- [ ] T048 [US4] Create catalog definition JSON schema in lib/a2ui/schemas/catalog-schema.json
- [ ] T049 [US4] Implement component property validation in lib/a2ui/catalog.ts
- [ ] T050 [US4] Create example custom components (ProductCard, UserProfile) in components/a2ui/custom/
- [ ] T051 [US4] Add catalog extension documentation in docs/a2ui-custom-components.md
- [ ] T052 [US4] Create catalog manager UI for viewing available components in components/a2ui/catalog-viewer.tsx

**Checkpoint**: Custom components can be defined, registered, and used by AI

---

## Phase 7: User Story 5 - Bidirectional Data Flow (Priority: P3)

**Goal**: Complete the A2UI loop with structured event flow from UI back to AI

**Independent Test**: AI generates Yes/No dialog → user clicks → AI receives typed event → conversation continues

### Implementation for User Story 5

- [ ] T053 [US5] Create A2UI Dialog component in components/a2ui/components/a2ui-dialog.tsx
- [ ] T054 [US5] Implement userAction payload builder in lib/a2ui/events.ts
- [ ] T055 [US5] Create action → AI message transformer in lib/a2ui/action-transformer.ts
- [ ] T056 [US5] Integrate A2UI events with chat submission flow in components/chat/chat-container.tsx
- [ ] T057 [US5] Add A2UI event history to conversation context for AI awareness
- [ ] T058 [US5] Create confirmation/action button patterns in lib/a2ui/templates/actions.ts

**Checkpoint**: User interactions in A2UI flow back to AI as structured events

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Testing, documentation, and performance optimization

- [ ] T059 [P] Create A2UI parser unit tests in lib/a2ui/__tests__/parser.test.ts
- [ ] T060 [P] Create A2UI data model unit tests in lib/a2ui/__tests__/data-model.test.ts
- [ ] T061 [P] Create A2UI component tests in components/a2ui/__tests__/
- [ ] T062 Create A2UI E2E test for form flow in e2e/features/a2ui-forms.spec.ts
- [ ] T063 Create A2UI E2E test for chart rendering in e2e/features/a2ui-charts.spec.ts
- [ ] T064 [P] Add A2UI loading states and skeleton components
- [ ] T065 [P] Add A2UI error boundary for graceful degradation
- [ ] T066 Performance optimization: memoization for A2UI component tree
- [ ] T067 Performance optimization: virtual list for large A2UI lists
- [ ] T068 [P] Add A2UI accessibility (ARIA labels, keyboard navigation)
- [ ] T069 Create A2UI developer documentation in docs/a2ui-integration.md
- [ ] T070 Add A2UI settings to Settings panel (enable/disable, default catalog)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Phase 2 completion
  - US1 (Forms) can start immediately after Phase 2
  - US2 (Charts) can start immediately after Phase 2
  - US3 (Tools) can start immediately after Phase 2
  - US4 (Catalog) depends on US1 basic components
  - US5 (Events) depends on US1 basic components
- **Polish (Phase 8)**: Can start after US1 is complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories - MVP
- **User Story 2 (P2)**: No dependencies on other stories - parallel to US1
- **User Story 3 (P2)**: No dependencies on other stories - parallel to US1/US2
- **User Story 4 (P3)**: Benefits from US1 components but independent
- **User Story 5 (P3)**: Benefits from US1 components but independent

### Within Each Phase

- Tasks marked [P] can run in parallel
- Sequential tasks depend on prior tasks in same phase
- Models/utilities before components
- Components before integrations

### Parallel Opportunities

**Phase 1 Parallel Group:**
```
T002, T003, T004, T005, T007 (all [P] - different files)
```

**Phase 2 Parallel Group:**
```
T012, T013, T014, T015 (all [P] - different components)
```

**Phase 3 (US1) Parallel Group:**
```
T019, T020, T021, T022, T023, T024, T025 (all [P] - independent input components)
```

**Phase 4 (US2) Parallel Group:**
```
T033, T034, T035 (all [P] - independent display components)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T008)
2. Complete Phase 2: Foundational (T009-T018)
3. Complete Phase 3: User Story 1 Forms (T019-T032)
4. **STOP and VALIDATE**: Test form generation end-to-end
5. Deploy/demo: AI can generate interactive forms

### Incremental Delivery

1. **MVP**: Setup + Foundational + US1 → Interactive forms work
2. **+Charts**: Add US2 → Data visualization works
3. **+Tools**: Add US3 → Agent tool outputs render richly
4. **+Custom**: Add US4 → Custom components supported
5. **+Events**: Add US5 → Full bidirectional flow
6. **+Polish**: Add Phase 8 → Production-ready

### File Creation Summary

**New Directories:**
- `lib/a2ui/`
- `lib/a2ui/__tests__/`
- `lib/a2ui/schemas/`
- `lib/a2ui/templates/`
- `components/a2ui/`
- `components/a2ui/components/`
- `components/a2ui/custom/`
- `components/a2ui/__tests__/`

**New Files (70 tasks):**
- Types: 1 file
- Library: 10+ files
- Components: 20+ files
- Store: 1 file
- Hooks: 2 files
- Tests: 5+ files
- Documentation: 2 files

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- shadcn/ui components used: Button, Input, Select, Checkbox, RadioGroup, Calendar, Popover, Slider, Card, Table, Dialog
- Recharts used for chart rendering (already in project)
- JSON Pointer (RFC 6901) for data binding paths
- A2UI v0.9 spec as reference (draft but stable core features)
