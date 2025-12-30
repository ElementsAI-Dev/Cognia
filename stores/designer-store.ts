/**
 * Designer Store - manages V0-style web page designer state
 */

import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  DesignerElement,
  ViewportSize,
  DesignerMode,
  DesignerHistoryEntry,
} from '@/types/designer';

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
  activeStyleCategory: string;
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
  parseCodeToElements: (code: string) => void;
  
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
  setActiveStyleCategory: (category: string) => void;
  
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
  activeStyleCategory: 'layout',
};

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
    children: tree.children.map((child) => updateElementInTree(child, id, updates)!).filter(Boolean),
  };
}

// Helper to delete element from tree
function deleteElementFromTree(
  tree: DesignerElement | null,
  id: string
): DesignerElement | null {
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
    const insertIndex = index !== undefined ? Math.min(index, newChildren.length) : newChildren.length;
    newChildren.splice(insertIndex, 0, { ...element, parentId });
    return { ...tree, children: newChildren };
  }

  return {
    ...tree,
    children: tree.children.map((child) =>
      insertElementInTree(child, parentId, element, index)!
    ).filter(Boolean),
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
function cloneElementWithNewIds(element: DesignerElement, newParentId: string | null): DesignerElement {
  const newId = nanoid();
  return {
    ...element,
    id: newId,
    parentId: newParentId,
    children: element.children.map((child) => cloneElementWithNewIds(child, newId)),
  };
}

export const useDesignerStore = create<DesignerState & DesignerActions>()((set, get) => ({
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
    const { elementTree, selectedElementId, code: previousCode, syncCodeFromElements, addHistoryEntry } = get();
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

  parseCodeToElements: (code: string) => {
    // Parse code and build element tree
    // This is a simplified parser - in production, use a proper AST parser
    const tree = parseHTMLToElementTree(code);
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
  setActiveStyleCategory: (category) => set({ activeStyleCategory: category }),

  // Reset
  reset: () => set(initialState),
}));

// Convert element tree back to React/HTML code
function elementTreeToCode(element: DesignerElement, originalCode: string): string {
  // Check if original code is React (contains function/export)
  const isReact = originalCode.includes('function') && 
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

// Simple HTML parser to element tree
function parseHTMLToElementTree(html: string): DesignerElement | null {
  if (typeof window === 'undefined') return null;
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;
  
  if (!body.firstElementChild) return null;
  
  return domToDesignerElement(body.firstElementChild as HTMLElement, null);
}

function domToDesignerElement(
  element: HTMLElement,
  parentId: string | null
): DesignerElement {
  const id = nanoid();
  
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
    designerElement.children.push(
      domToDesignerElement(child as HTMLElement, id)
    );
  }
  
  return designerElement;
}

export default useDesignerStore;
