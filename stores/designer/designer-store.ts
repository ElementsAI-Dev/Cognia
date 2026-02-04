/**
 * Designer Store - manages V0-style web page designer state
 * Enhanced with persistence for user preferences
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { parseCodeToAst } from '@/lib/designer/elements';
import type {
  DesignerElement,
  ViewportSize,
  DesignerMode,
  DesignerHistoryEntry,
} from '@/types/designer';

// Panel layout configuration
export interface PanelLayout {
  elementTreeSize: number;
  previewSize: number;
  stylePanelSize: number;
  historyPanelSize: number;
}

export const DEFAULT_PANEL_LAYOUT: PanelLayout = {
  elementTreeSize: 20,
  previewSize: 55,
  stylePanelSize: 25,
  historyPanelSize: 20,
};

interface DesignerState {
  // Mode
  mode: DesignerMode;

  // Selected element
  selectedElementId: string | null;
  hoveredElementId: string | null;

  // Element tree (parsed from code)
  elementTree: DesignerElement | null;
  elementMap: Record<string, DesignerElement>;

  // Viewport
  viewport: ViewportSize;
  zoom: number;

  // Code sync
  code: string;
  isDirty: boolean;

  // History for undo/redo
  history: DesignerHistoryEntry[];
  historyIndex: number;

  // AI editing
  isAIEditing: boolean;
  aiEditPrompt: string;

  // Panel states
  showElementTree: boolean;
  showStylePanel: boolean;
  showHistoryPanel: boolean;
  showAIPanel: boolean;
  activeStyleCategory: string;
  
  // Style panel expanded categories (persisted)
  expandedStyleCategories: string[];
  
  // Panel layout sizes (persisted)
  panelLayout: PanelLayout;
  
  // Mobile layout mode
  isMobileLayout: boolean;
  mobileActiveTab: 'preview' | 'code' | 'elements' | 'styles';
}

interface DesignerActions {
  // Mode
  setMode: (mode: DesignerMode) => void;

  // Selection
  selectElement: (id: string | null) => void;
  hoverElement: (id: string | null) => void;

  // Element tree
  setElementTree: (tree: DesignerElement | null) => void;
  updateElement: (id: string, updates: Partial<DesignerElement>) => void;
  updateElementStyle: (id: string, styles: Record<string, string>) => void;
  updateElementAttribute: (id: string, key: string, value: string) => void;
  updateElementText: (id: string, text: string) => void;
  deleteElement: (id: string) => void;

  // Drag-drop operations
  insertElement: (parentId: string | null, element: DesignerElement, index?: number) => void;
  moveElement: (elementId: string, newParentId: string | null, index?: number) => void;
  duplicateElement: (elementId: string) => string | null;

  // Viewport
  setViewport: (viewport: ViewportSize) => void;
  setZoom: (zoom: number) => void;

  // Code
  setCode: (code: string, addToHistory?: boolean) => void;
  syncCodeFromElements: () => void;
  parseCodeToElements: (code: string) => Promise<void>;

  // History
  undo: () => void;
  redo: () => void;
  addHistoryEntry: (action: string, previousCode: string, newCode: string) => void;

  // AI editing
  setAIEditing: (isEditing: boolean) => void;
  setAIEditPrompt: (prompt: string) => void;

  // Panel states
  toggleElementTree: () => void;
  toggleStylePanel: () => void;
  toggleHistoryPanel: () => void;
  toggleAIPanel: () => void;
  setActiveStyleCategory: (category: string) => void;
  
  // Style panel expanded categories
  setExpandedStyleCategories: (categories: string[]) => void;
  toggleStyleCategory: (category: string) => void;
  
  // Panel layout
  setPanelLayout: (layout: Partial<PanelLayout>) => void;
  resetPanelLayout: () => void;
  
  // Mobile layout
  setMobileLayout: (isMobile: boolean) => void;
  setMobileActiveTab: (tab: 'preview' | 'code' | 'elements' | 'styles') => void;

  // Reset
  reset: () => void;
}

const initialState: DesignerState = {
  mode: 'preview',
  selectedElementId: null,
  hoveredElementId: null,
  elementTree: null,
  elementMap: {},
  viewport: 'desktop',
  zoom: 100,
  code: '',
  isDirty: false,
  history: [],
  historyIndex: -1,
  isAIEditing: false,
  aiEditPrompt: '',
  showElementTree: true,
  showStylePanel: true,
  showHistoryPanel: false,
  showAIPanel: false,
  activeStyleCategory: 'layout',
  expandedStyleCategories: ['layout'],
  panelLayout: DEFAULT_PANEL_LAYOUT,
  isMobileLayout: false,
  mobileActiveTab: 'preview',
};

let parseRequestId = 0;

// Helper to build element map from tree
function buildElementMap(element: DesignerElement | null): Record<string, DesignerElement> {
  if (!element) return {};

  const map: Record<string, DesignerElement> = { [element.id]: element };

  for (const child of element.children) {
    Object.assign(map, buildElementMap(child));
  }

  return map;
}

// Helper to update element in tree
function updateElementInTree(
  tree: DesignerElement | null,
  id: string,
  updates: Partial<DesignerElement>
): DesignerElement | null {
  if (!tree) return null;

  if (tree.id === id) {
    return { ...tree, ...updates };
  }

  return {
    ...tree,
    children: tree.children
      .map((child) => updateElementInTree(child, id, updates)!)
      .filter(Boolean),
  };
}

// Helper to delete element from tree
function deleteElementFromTree(tree: DesignerElement | null, id: string): DesignerElement | null {
  if (!tree) return null;
  if (tree.id === id) return null;

  return {
    ...tree,
    children: tree.children
      .map((child) => deleteElementFromTree(child, id))
      .filter((child): child is DesignerElement => child !== null),
  };
}

// Helper to insert element as child of parent at index
function insertElementInTree(
  tree: DesignerElement | null,
  parentId: string | null,
  element: DesignerElement,
  index?: number
): DesignerElement | null {
  if (!tree) {
    // If no tree exists, the new element becomes the root
    if (parentId === null) {
      return element;
    }
    return null;
  }

  // If inserting at root level and tree exists, wrap both in a container
  if (parentId === null) {
    return {
      id: nanoid(),
      tagName: 'div',
      className: '',
      attributes: {},
      styles: {},
      children: [tree, element],
      parentId: null,
    };
  }

  if (tree.id === parentId) {
    const newChildren = [...tree.children];
    const insertIndex =
      index !== undefined ? Math.min(index, newChildren.length) : newChildren.length;
    newChildren.splice(insertIndex, 0, { ...element, parentId });
    return { ...tree, children: newChildren };
  }

  return {
    ...tree,
    children: tree.children
      .map((child) => insertElementInTree(child, parentId, element, index)!)
      .filter(Boolean),
  };
}

// Helper to find element by id
function findElementInTree(tree: DesignerElement | null, id: string): DesignerElement | null {
  if (!tree) return null;
  if (tree.id === id) return tree;

  for (const child of tree.children) {
    const found = findElementInTree(child, id);
    if (found) return found;
  }

  return null;
}

// Helper to find parent of element
function findParentInTree(tree: DesignerElement | null, id: string): DesignerElement | null {
  if (!tree) return null;

  for (const child of tree.children) {
    if (child.id === id) return tree;
    const found = findParentInTree(child, id);
    if (found) return found;
  }

  return null;
}

// Helper to deep clone element with new IDs
function cloneElementWithNewIds(
  element: DesignerElement,
  newParentId: string | null
): DesignerElement {
  const newId = nanoid();
  return {
    ...element,
    id: newId,
    parentId: newParentId,
    children: element.children.map((child) => cloneElementWithNewIds(child, newId)),
  };
}

export const useDesignerStore = create<DesignerState & DesignerActions>()(
  persist(
    (set, get) => ({
  ...initialState,

  // Mode
  setMode: (mode) => set({ mode }),

  // Selection
  selectElement: (id) => set({ selectedElementId: id }),
  hoverElement: (id) => set({ hoveredElementId: id }),

  // Element tree
  setElementTree: (tree) => {
    const elementMap = buildElementMap(tree);
    set({ elementTree: tree, elementMap });
  },

  updateElement: (id, updates) => {
    const { elementTree, code: previousCode, syncCodeFromElements, addHistoryEntry } = get();
    const newTree = updateElementInTree(elementTree, id, updates);
    const elementMap = buildElementMap(newTree);
    set({ elementTree: newTree, elementMap, isDirty: true });
    // Sync code and add history entry
    syncCodeFromElements();
    const { code: newCode } = get();
    if (previousCode !== newCode) {
      // Determine action type based on what was updated
      let action = 'Element updated';
      if ('styles' in updates) action = 'Style changed';
      else if ('textContent' in updates) action = 'Text changed';
      else if ('attributes' in updates) action = 'Attribute changed';
      addHistoryEntry(action, previousCode, newCode);
    }
  },

  updateElementStyle: (id, styles) => {
    const { elementMap, updateElement } = get();
    const element = elementMap[id];
    if (!element) return;

    updateElement(id, {
      styles: { ...element.styles, ...styles },
    });
  },

  updateElementAttribute: (id, key, value) => {
    const { elementMap, updateElement } = get();
    const element = elementMap[id];
    if (!element) return;

    updateElement(id, {
      attributes: { ...element.attributes, [key]: value },
    });
  },

  updateElementText: (id, text) => {
    const { updateElement } = get();
    updateElement(id, { textContent: text });
  },

  deleteElement: (id) => {
    const {
      elementTree,
      selectedElementId,
      code: previousCode,
      syncCodeFromElements,
      addHistoryEntry,
    } = get();
    const newTree = deleteElementFromTree(elementTree, id);
    const elementMap = buildElementMap(newTree);
    set({
      elementTree: newTree,
      elementMap,
      isDirty: true,
      selectedElementId: selectedElementId === id ? null : selectedElementId,
    });
    // Sync code and add history entry
    syncCodeFromElements();
    const { code: newCode } = get();
    if (previousCode !== newCode) {
      addHistoryEntry('Element deleted', previousCode, newCode);
    }
  },

  // Drag-drop operations
  insertElement: (parentId, element, index) => {
    const { elementTree, code: previousCode, syncCodeFromElements, addHistoryEntry } = get();
    const newTree = insertElementInTree(elementTree, parentId, element, index);
    const elementMap = buildElementMap(newTree);
    set({
      elementTree: newTree,
      elementMap,
      isDirty: true,
      selectedElementId: element.id,
    });
    // Sync code and add history entry
    syncCodeFromElements();
    const { code: newCode } = get();
    if (previousCode !== newCode) {
      addHistoryEntry('Element inserted', previousCode, newCode);
    }
  },

  moveElement: (elementId, newParentId, index) => {
    const { elementTree, code: previousCode, syncCodeFromElements, addHistoryEntry } = get();
    if (!elementTree) return;

    // Find the element to move
    const element = findElementInTree(elementTree, elementId);
    if (!element) return;

    // Prevent moving to self or descendant
    const isDescendant = (parentId: string | null): boolean => {
      if (parentId === null) return false;
      if (parentId === elementId) return true;
      const parent = findElementInTree(elementTree, parentId);
      return parent ? isDescendant(parent.parentId) : false;
    };

    if (newParentId && isDescendant(newParentId)) return;

    // Remove from old position
    const treeAfterRemove = deleteElementFromTree(elementTree, elementId);

    // Insert at new position
    const elementWithNewParent = { ...element, parentId: newParentId };
    const newTree = insertElementInTree(treeAfterRemove, newParentId, elementWithNewParent, index);
    const elementMap = buildElementMap(newTree);

    set({
      elementTree: newTree,
      elementMap,
      isDirty: true,
    });
    // Sync code and add history entry
    syncCodeFromElements();
    const { code: newCode } = get();
    if (previousCode !== newCode) {
      addHistoryEntry('Element moved', previousCode, newCode);
    }
  },

  duplicateElement: (elementId) => {
    const { elementTree, code: previousCode, syncCodeFromElements, addHistoryEntry } = get();
    if (!elementTree) return null;

    // Find the element and its parent
    const element = findElementInTree(elementTree, elementId);
    if (!element) return null;

    const parent = findParentInTree(elementTree, elementId);
    const parentId = parent?.id ?? null;

    // Find the index of the original element
    let insertIndex: number | undefined;
    if (parent) {
      const originalIndex = parent.children.findIndex((c) => c.id === elementId);
      if (originalIndex !== -1) {
        insertIndex = originalIndex + 1;
      }
    }

    // Clone with new IDs
    const cloned = cloneElementWithNewIds(element, parentId);

    // Insert the clone directly (without calling insertElement to avoid double history)
    const newTree = insertElementInTree(elementTree, parentId, cloned, insertIndex);
    const elementMap = buildElementMap(newTree);
    set({
      elementTree: newTree,
      elementMap,
      isDirty: true,
      selectedElementId: cloned.id,
    });

    // Sync code and add history entry
    syncCodeFromElements();
    const { code: newCode } = get();
    if (previousCode !== newCode) {
      addHistoryEntry('Element duplicated', previousCode, newCode);
    }

    return cloned.id;
  },

  // Viewport
  setViewport: (viewport) => set({ viewport }),
  setZoom: (zoom) => set({ zoom: Math.max(25, Math.min(200, zoom)) }),

  // Code
  setCode: (code, addToHistory = true) => {
    const { code: previousCode, addHistoryEntry } = get();

    if (addToHistory && previousCode !== code) {
      addHistoryEntry('Code change', previousCode, code);
    }

    set({ code, isDirty: false });
  },

  syncCodeFromElements: () => {
    const { elementTree, code } = get();
    if (!elementTree) return;

    // Convert element tree back to code
    const generatedCode = elementTreeToCode(elementTree, code);
    // Keep isDirty state - syncing code doesn't mean document is saved
    set({ code: generatedCode });
  },

  parseCodeToElements: async (code: string) => {
    const requestId = ++parseRequestId;
    // Parse code and build element tree
    // This is a simplified parser - in production, use a proper AST parser
    const tree = await parseHTMLToElementTree(code);
    if (requestId !== parseRequestId) return;
    const elementMap = buildElementMap(tree);
    set({ code, elementTree: tree, elementMap, isDirty: false });
  },

  // History
  undo: () => {
    const { history, historyIndex, setCode } = get();
    if (historyIndex < 0) return;

    const entry = history[historyIndex];
    if (entry) {
      setCode(entry.previousCode, false);
      set({ historyIndex: historyIndex - 1 });
    }
  },

  redo: () => {
    const { history, historyIndex, setCode } = get();
    if (historyIndex >= history.length - 1) return;

    const entry = history[historyIndex + 1];
    if (entry) {
      setCode(entry.newCode, false);
      set({ historyIndex: historyIndex + 1 });
    }
  },

  addHistoryEntry: (action, previousCode, newCode) => {
    const { history, historyIndex } = get();

    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);

    const entry: DesignerHistoryEntry = {
      id: nanoid(),
      timestamp: new Date(),
      action,
      previousCode,
      newCode,
    };

    newHistory.push(entry);

    // Keep only last 50 entries
    if (newHistory.length > 50) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  // AI editing
  setAIEditing: (isEditing) => set({ isAIEditing: isEditing }),
  setAIEditPrompt: (prompt) => set({ aiEditPrompt: prompt }),

  // Panel states
  toggleElementTree: () => set((state) => ({ showElementTree: !state.showElementTree })),
  toggleStylePanel: () => set((state) => ({ showStylePanel: !state.showStylePanel })),
  toggleHistoryPanel: () => set((state) => ({ showHistoryPanel: !state.showHistoryPanel })),
  toggleAIPanel: () => set((state) => ({ showAIPanel: !state.showAIPanel })),
  setActiveStyleCategory: (category) => set({ activeStyleCategory: category }),
  
  // Style panel expanded categories
  setExpandedStyleCategories: (categories) => set({ expandedStyleCategories: categories }),
  toggleStyleCategory: (category) =>
    set((state) => ({
      expandedStyleCategories: state.expandedStyleCategories.includes(category)
        ? state.expandedStyleCategories.filter((c) => c !== category)
        : [...state.expandedStyleCategories, category],
    })),
  
  // Panel layout
  setPanelLayout: (layout) =>
    set((state) => ({
      panelLayout: { ...state.panelLayout, ...layout },
    })),
  resetPanelLayout: () => set({ panelLayout: DEFAULT_PANEL_LAYOUT }),
  
  // Mobile layout
  setMobileLayout: (isMobile) => set({ isMobileLayout: isMobile }),
  setMobileActiveTab: (tab) => set({ mobileActiveTab: tab }),

  // Reset
  reset: () => set(initialState),
    }),
    {
      name: 'cognia-designer',
      partialize: (state) => ({
        // Only persist user preferences, not transient state
        mode: state.mode,
        viewport: state.viewport,
        zoom: state.zoom,
        showElementTree: state.showElementTree,
        showStylePanel: state.showStylePanel,
        showHistoryPanel: state.showHistoryPanel,
        showAIPanel: state.showAIPanel,
        activeStyleCategory: state.activeStyleCategory,
        expandedStyleCategories: state.expandedStyleCategories,
        panelLayout: state.panelLayout,
      }),
    }
  )
);

// Convert element tree back to React/HTML code
function elementTreeToCode(element: DesignerElement, originalCode: string): string {
  // Check if original code is React (contains function/export)
  const isReact =
    originalCode.includes('function') &&
    (originalCode.includes('return') || originalCode.includes('=>'));

  if (isReact) {
    // For React code, we need to regenerate the JSX
    const jsx = elementToJSX(element, 2);

    // Try to find and replace the return statement content
    const returnMatch = originalCode.match(/return\s*\(\s*([\s\S]*?)\s*\);?\s*\}$/);
    if (returnMatch) {
      const beforeReturn = originalCode.slice(0, originalCode.lastIndexOf('return'));
      return `${beforeReturn}return (\n${jsx}\n  );\n}`;
    }

    // Fallback: generate a simple component
    return `export default function App() {
  return (
${jsx}
  );
}`;
  }

  // For plain HTML, just convert the element tree
  return elementToHTML(element, 0);
}

// Convert a single element to JSX string
function elementToJSX(element: DesignerElement, indent: number): string {
  const spaces = '  '.repeat(indent);
  const tag = element.tagName;

  // Build attributes string
  const attrs: string[] = [];

  // Add className
  if (element.className) {
    attrs.push(`className="${element.className}"`);
  }

  // Add styles as inline style object
  if (Object.keys(element.styles).length > 0) {
    const styleEntries = Object.entries(element.styles)
      .map(([key, value]) => `${key}: '${value}'`)
      .join(', ');
    attrs.push(`style={{ ${styleEntries} }}`);
  }

  // Add other attributes
  for (const [key, value] of Object.entries(element.attributes)) {
    if (key === 'class') continue; // Already handled as className
    // Convert some HTML attributes to React equivalents
    const reactKey = key === 'for' ? 'htmlFor' : key;
    attrs.push(`${reactKey}="${value}"`);
  }

  const attrString = attrs.length > 0 ? ' ' + attrs.join(' ') : '';

  // Self-closing tags
  const selfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link'].includes(tag);

  if (selfClosing && element.children.length === 0 && !element.textContent) {
    return `${spaces}<${tag}${attrString} />`;
  }

  // Opening tag
  let result = `${spaces}<${tag}${attrString}>`;

  // Handle text content and children
  const hasChildren = element.children.length > 0;
  const hasText = element.textContent && element.textContent.trim();

  if (hasChildren) {
    result += '\n';
    for (const child of element.children) {
      result += elementToJSX(child, indent + 1) + '\n';
    }
    result += `${spaces}</${tag}>`;
  } else if (hasText) {
    result += element.textContent + `</${tag}>`;
  } else {
    result += `</${tag}>`;
  }

  return result;
}

// Convert a single element to HTML string
function elementToHTML(element: DesignerElement, indent: number): string {
  const spaces = '  '.repeat(indent);
  const tag = element.tagName;

  // Build attributes string
  const attrs: string[] = [];

  // Add class
  if (element.className) {
    attrs.push(`class="${element.className}"`);
  }

  // Add inline styles
  if (Object.keys(element.styles).length > 0) {
    const styleString = Object.entries(element.styles)
      .map(([key, value]) => {
        // Convert camelCase to kebab-case
        const kebabKey = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        return `${kebabKey}: ${value}`;
      })
      .join('; ');
    attrs.push(`style="${styleString}"`);
  }

  // Add other attributes
  for (const [key, value] of Object.entries(element.attributes)) {
    if (key === 'class') continue;
    attrs.push(`${key}="${value}"`);
  }

  const attrString = attrs.length > 0 ? ' ' + attrs.join(' ') : '';

  // Self-closing tags
  const selfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link'].includes(tag);

  if (selfClosing && element.children.length === 0 && !element.textContent) {
    return `${spaces}<${tag}${attrString} />`;
  }

  let result = `${spaces}<${tag}${attrString}>`;

  const hasChildren = element.children.length > 0;
  const hasText = element.textContent && element.textContent.trim();

  if (hasChildren) {
    result += '\n';
    for (const child of element.children) {
      result += elementToHTML(child, indent + 1) + '\n';
    }
    result += `${spaces}</${tag}>`;
  } else if (hasText) {
    result += element.textContent + `</${tag}>`;
  } else {
    result += `</${tag}>`;
  }

  return result;
}

// Enhanced parser that handles both HTML and React/JSX code
async function parseHTMLToElementTree(code: string): Promise<DesignerElement | null> {
  if (typeof window === 'undefined') return null;

  // Reset ID counter for deterministic IDs matching preview iframe
  resetElementIdCounter();

  // Check if this is React code
  const isReact = code.includes('function') && (code.includes('return') || code.includes('=>'));

  if (isReact) {
    return parseReactToElementTree(code);
  }

  // Fall back to HTML parsing
  const parser = new DOMParser();
  const doc = parser.parseFromString(code, 'text/html');
  const body = doc.body;

  if (!body.firstElementChild) return null;

  return domToDesignerElement(body.firstElementChild as HTMLElement, null);
}

type AstNode = NonNullable<Awaited<ReturnType<typeof parseCodeToAst>>>;

function findJsxRootNode(ast: AstNode): AstNode | null {
  const queue: AstNode[] = [ast];

  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) continue;

    if (node.type === 'ReturnStatement') {
      const argument = (node as unknown as { argument?: AstNode }).argument;
      if (argument && (argument.type === 'JSXElement' || argument.type === 'JSXFragment')) {
        return argument;
      }
    }

    if (node.type === 'ArrowFunctionExpression') {
      const body = (node as unknown as { body?: AstNode }).body;
      if (body && (body.type === 'JSXElement' || body.type === 'JSXFragment')) {
        return body;
      }
    }

    const traverseProps = [
      'body',
      'declarations',
      'init',
      'argument',
      'expression',
      'consequent',
      'alternate',
      'declaration',
      'properties',
      'value',
      'arguments',
      'elements',
    ];

    for (const prop of traverseProps) {
      const value = (node as unknown as Record<string, unknown>)[prop];
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object') queue.push(item as AstNode);
        }
      } else if (value && typeof value === 'object') {
        queue.push(value as AstNode);
      }
    }
  }

  return null;
}

function buildDesignerElementFromJsx(node: AstNode, parentId: string | null): DesignerElement | null {
  if (node.type === 'JSXFragment') {
    const fragmentChildren = getJsxChildElements(node);
    if (fragmentChildren.length === 0) return null;
    return buildDesignerElementFromJsx(fragmentChildren[0], parentId);
  }

  if (node.type !== 'JSXElement') return null;

  const openingElement = (node as unknown as { openingElement?: { name?: AstNode; attributes?: AstNode[] } }).openingElement;
  if (!openingElement?.name) return null;

  const tagName = getJsxElementName(openingElement.name);
  const attributes: Record<string, string> = {};
  let className = '';
  let styles: Record<string, string> = {};

  for (const attr of openingElement.attributes ?? []) {
    if (attr.type !== 'JSXAttribute') continue;
    const nameNode = (attr as unknown as { name?: { name?: string } }).name;
    const attrName = nameNode?.name;
    if (!attrName) continue;

    if (attrName === 'style') {
      styles = {
        ...styles,
        ...parseJsxStyleAttribute(attr as AstNode),
      };
      continue;
    }

    const value = parseJsxAttributeValue(attr as AstNode);
    if (value === undefined) continue;

    if (attrName === 'className' || attrName === 'class') {
      className = value;
    } else {
      attributes[attrName] = value;
    }
  }

  const id = generateElementId();
  const children: DesignerElement[] = [];

  const textContent = extractJsxTextContent(node);

  for (const child of getJsxChildElements(node)) {
    const childElement = buildDesignerElementFromJsx(child, id);
    if (childElement) children.push(childElement);
  }

  return {
    id,
    tagName: tagName.toLowerCase(),
    className,
    textContent: textContent || undefined,
    attributes,
    styles,
    children,
    parentId,
    sourceRange: node.loc
      ? {
          startLine: node.loc.start.line,
          endLine: node.loc.end.line,
          startColumn: node.loc.start.column,
          endColumn: node.loc.end.column,
        }
      : undefined,
  };
}

function getJsxChildElements(node: AstNode): AstNode[] {
  if (!node || !('children' in node)) return [];
  const children = (node as unknown as { children?: AstNode[] }).children ?? [];
  return children.filter((child) => child.type === 'JSXElement' || child.type === 'JSXFragment');
}

function getJsxElementName(nameNode: AstNode): string {
  if (nameNode.type === 'JSXIdentifier') {
    return (nameNode as unknown as { name: string }).name;
  }
  if (nameNode.type === 'JSXMemberExpression') {
    const member = nameNode as unknown as { object: AstNode; property: AstNode };
    return `${getJsxElementName(member.object)}.${getJsxElementName(member.property)}`;
  }
  if (nameNode.type === 'JSXNamespacedName') {
    const namespaced = nameNode as unknown as { namespace: { name: string }; name: { name: string } };
    return `${namespaced.namespace.name}:${namespaced.name.name}`;
  }
  return 'div';
}

function parseJsxAttributeValue(attr: AstNode): string | undefined {
  const value = (attr as unknown as { value?: AstNode | null }).value;
  if (!value) return 'true';

  if (value.type === 'StringLiteral') {
    return (value as unknown as { value: string }).value;
  }

  if (value.type === 'JSXExpressionContainer') {
    const expression = (value as unknown as { expression?: AstNode }).expression;
    if (!expression) return undefined;

    if (expression.type === 'StringLiteral') {
      return (expression as unknown as { value: string }).value;
    }

    if (expression.type === 'NumericLiteral') {
      return String((expression as unknown as { value: number }).value);
    }

    if (expression.type === 'TemplateLiteral') {
      const quasis = (expression as unknown as { quasis?: Array<{ value?: { cooked?: string } }> }).quasis ?? [];
      return quasis.map((quasi) => quasi.value?.cooked ?? '').join('');
    }
  }

  return undefined;
}

function parseJsxStyleAttribute(attr: AstNode): Record<string, string> {
  const value = (attr as unknown as { value?: AstNode | null }).value;
  if (!value) return {};

  if (value.type === 'StringLiteral') {
    return parseInlineStyleString((value as unknown as { value: string }).value);
  }

  if (value.type !== 'JSXExpressionContainer') return {};

  const expression = (value as unknown as { expression?: AstNode }).expression;
  if (!expression || expression.type !== 'ObjectExpression') return {};

  const styles: Record<string, string> = {};
  const properties = (expression as unknown as { properties?: AstNode[] }).properties ?? [];

  for (const property of properties) {
    if (property.type !== 'ObjectProperty') continue;

    const keyNode = (property as unknown as { key?: AstNode }).key;
    const valueNode = (property as unknown as { value?: AstNode }).value;
    if (!keyNode || !valueNode) continue;

    const key =
      keyNode.type === 'Identifier'
        ? (keyNode as unknown as { name: string }).name
        : keyNode.type === 'StringLiteral'
          ? (keyNode as unknown as { value: string }).value
          : undefined;

    if (!key) continue;

    let valueText: string | undefined;
    if (valueNode.type === 'StringLiteral') {
      valueText = (valueNode as unknown as { value: string }).value;
    } else if (valueNode.type === 'NumericLiteral') {
      valueText = String((valueNode as unknown as { value: number }).value);
    }

    if (valueText !== undefined) {
      styles[key] = valueText;
    }
  }

  return styles;
}

function parseInlineStyleString(style: string): Record<string, string> {
  const styles: Record<string, string> = {};
  style.split(';').forEach((rule) => {
    const [key, value] = rule.split(':').map((part) => part.trim());
    if (!key || !value) return;
    const camelKey = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    styles[camelKey] = value;
  });
  return styles;
}

function extractJsxTextContent(node: AstNode): string | null {
  if (!node || !('children' in node)) return null;
  const children = (node as unknown as { children?: AstNode[] }).children ?? [];

  for (const child of children) {
    if (child.type === 'JSXText') {
      const text = (child as unknown as { value?: string }).value?.trim();
      if (text) return text;
    }
    if (child.type === 'JSXExpressionContainer') {
      const expression = (child as unknown as { expression?: AstNode }).expression;
      if (expression?.type === 'StringLiteral') {
        const text = (expression as unknown as { value?: string }).value;
        if (text?.trim()) return text.trim();
      }
    }
  }

  return null;
}

// Parse React/JSX code to element tree
async function parseReactToElementTree(code: string): Promise<DesignerElement | null> {
  const astTree = await parseReactToElementTreeWithAst(code);
  if (astTree) return astTree;

  return parseReactToElementTreeFallback(code);
}

async function parseReactToElementTreeWithAst(code: string): Promise<DesignerElement | null> {
  const ast = await parseCodeToAst(code);
  if (!ast) return null;

  const rootNode = findJsxRootNode(ast);
  if (!rootNode) return null;

  return buildDesignerElementFromJsx(rootNode, null);
}

function parseReactToElementTreeFallback(code: string): DesignerElement | null {
  // Extract JSX from return statement
  const jsxContent = extractJSXFromReact(code);
  if (!jsxContent) return null;

  // Convert JSX to parseable HTML-like structure
  const htmlLike = convertJSXToHTML(jsxContent);

  // Parse as HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlLike, 'text/html');
  const body = doc.body;

  if (!body.firstElementChild) return null;

  return domToDesignerElement(body.firstElementChild as HTMLElement, null);
}

// Extract JSX content from React component code
function extractJSXFromReact(code: string): string | null {
  // Try to find return statement with JSX
  // Match: return ( ... ) or return <...>
  const returnMatch = code.match(/return\s*\(\s*([\s\S]*?)\s*\);?\s*(?:\}|$)/);
  if (returnMatch) {
    return returnMatch[1].trim();
  }

  // Try arrow function with implicit return
  const arrowMatch = code.match(/=>\s*\(\s*([\s\S]*?)\s*\)\s*(?:;|$)/);
  if (arrowMatch) {
    return arrowMatch[1].trim();
  }

  // Try arrow function with direct JSX
  const directArrowMatch = code.match(/=>\s*(<[\s\S]*?>)\s*(?:;|$)/);
  if (directArrowMatch) {
    return directArrowMatch[1].trim();
  }

  return null;
}

// Convert JSX syntax to HTML-parseable format
function convertJSXToHTML(jsx: string): string {
  let html = jsx;

  // Replace className with class
  html = html.replace(/className=/g, 'class=');

  // Replace htmlFor with for
  html = html.replace(/htmlFor=/g, 'for=');

  // Handle self-closing tags that aren't valid in HTML
  html = html.replace(/<(\w+)([^>]*?)\/>/g, (_, tag, attrs) => {
    const selfClosingTags = [
      'img',
      'br',
      'hr',
      'input',
      'meta',
      'link',
      'area',
      'base',
      'col',
      'embed',
      'source',
      'track',
      'wbr',
    ];
    if (selfClosingTags.includes(tag.toLowerCase())) {
      return `<${tag}${attrs}/>`;
    }
    return `<${tag}${attrs}></${tag}>`;
  });

  // Remove JSX expressions { ... } - replace with placeholder text
  // But preserve style objects
  html = html.replace(/\{([^{}]*)\}/g, (match, content) => {
    // Check if it's a style object
    if (content.trim().startsWith('{') || content.includes(':')) {
      // Try to extract style value
      return `style="${extractStyleString(content)}"`;
    }
    // For other expressions, use placeholder
    return `[${content.trim().slice(0, 30)}]`;
  });

  // Handle template literals in attributes
  html = html.replace(/=\{`([^`]*)`\}/g, '="$1"');

  // Handle string literals in attributes
  html = html.replace(/=\{['"]([^'"]*)['"]\}/g, '="$1"');

  // Handle boolean attributes
  html = html.replace(/=\{true\}/g, '');
  html = html.replace(/=\{false\}/g, '');

  // Clean up any remaining curly braces in attributes
  html = html.replace(/=\{([^}]+)\}/g, '="$1"');

  return html;
}

// Extract style string from JSX style object
function extractStyleString(styleContent: string): string {
  // Remove outer braces if present
  let content = styleContent.trim();
  if (content.startsWith('{')) {
    content = content.slice(1);
  }
  if (content.endsWith('}')) {
    content = content.slice(0, -1);
  }

  // Parse simple key: value pairs
  const styles: string[] = [];
  const pairs = content.split(',');

  for (const pair of pairs) {
    const colonIndex = pair.indexOf(':');
    if (colonIndex > 0) {
      let key = pair.slice(0, colonIndex).trim();
      let value = pair.slice(colonIndex + 1).trim();

      // Convert camelCase to kebab-case
      key = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

      // Remove quotes from value
      value = value.replace(/['"]/g, '');

      styles.push(`${key}: ${value}`);
    }
  }

  return styles.join('; ');
}

// Global counter for deterministic ID generation
let elementIdCounter = 0;

// Reset counter before parsing
function resetElementIdCounter() {
  elementIdCounter = 0;
}

// Generate deterministic element ID matching preview iframe
function generateElementId(): string {
  return `el-${elementIdCounter++}`;
}

function domToDesignerElement(element: HTMLElement, parentId: string | null): DesignerElement {
  const id = generateElementId();

  // Extract styles from style attribute
  const styles: Record<string, string> = {};
  const styleAttr = element.getAttribute('style');
  if (styleAttr) {
    styleAttr.split(';').forEach((rule) => {
      const [key, value] = rule.split(':').map((s) => s.trim());
      if (key && value) {
        // Convert kebab-case to camelCase
        const camelKey = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        styles[camelKey] = value;
      }
    });
  }

  // Extract attributes
  const attributes: Record<string, string> = {};
  for (const attr of Array.from(element.attributes)) {
    if (attr.name !== 'style' && attr.name !== 'class') {
      attributes[attr.name] = attr.value;
    }
  }

  // Get text content (only direct text, not from children)
  let textContent: string | undefined;
  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      textContent = node.textContent.trim();
      break;
    }
  }

  const designerElement: DesignerElement = {
    id,
    tagName: element.tagName.toLowerCase(),
    className: element.className,
    textContent,
    attributes,
    styles,
    children: [],
    parentId,
  };

  // Parse children
  for (const child of Array.from(element.children)) {
    designerElement.children.push(domToDesignerElement(child as HTMLElement, id));
  }

  return designerElement;
}

export default useDesignerStore;
