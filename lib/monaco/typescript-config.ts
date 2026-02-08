/**
 * TypeScript Language Configuration for Monaco Editor
 * Provides comprehensive TypeScript/JavaScript language setup
 */

import type { Monaco } from '@monaco-editor/react';

/**
 * TypeScript compiler options for Monaco
 */
export const TYPESCRIPT_COMPILER_OPTIONS = {
  target: 99, // ESNext
  module: 99, // ESNext
  moduleResolution: 2, // NodeJs
  lib: ['esnext', 'dom', 'dom.iterable'],
  jsx: 4, // ReactJSX
  strict: true,
  esModuleInterop: true,
  skipLibCheck: true,
  forceConsistentCasingInFileNames: true,
  noEmit: true,
  allowJs: true,
  checkJs: false,
  resolveJsonModule: true,
  isolatedModules: true,
  noUnusedLocals: true,
  noUnusedParameters: true,
  noImplicitReturns: true,
  noFallthroughCasesInSwitch: true,
  allowSyntheticDefaultImports: true,
  experimentalDecorators: true,
  emitDecoratorMetadata: true,
  baseUrl: '.',
  paths: {
    '@/*': ['*'],
  },
};

/**
 * Configure TypeScript/JavaScript language defaults
 */
export function configureTypeScriptDefaults(monaco: Monaco): void {
  // TypeScript configuration
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    lib: ['esnext', 'dom', 'dom.iterable'],
    jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    noEmit: true,
    allowJs: true,
    checkJs: false,
    resolveJsonModule: true,
    isolatedModules: true,
    noUnusedLocals: true,
    noUnusedParameters: true,
    noImplicitReturns: true,
    noFallthroughCasesInSwitch: true,
    allowSyntheticDefaultImports: true,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    baseUrl: '.',
    paths: {
      '@/*': ['*'],
    },
    allowNonTsExtensions: true,
  });

  // JavaScript configuration
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    allowJs: true,
    checkJs: true,
    jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    allowNonTsExtensions: true,
  });

  // Enable diagnostics
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false,
  });

  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false,
  });

  // Enable IntelliSense features
  monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
  monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
}

/**
 * Add React type definitions
 */
export function addReactTypes(monaco: Monaco): void {
  const reactTypes = `
declare module 'react' {
  export type FC<P = {}> = FunctionComponent<P>;
  export interface FunctionComponent<P = {}> {
    (props: P): ReactElement<any, any> | null;
    displayName?: string;
  }
  export type ReactNode = ReactElement | string | number | boolean | null | undefined;
  export interface ReactElement<P = any, T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>> {
    type: T;
    props: P;
    key: Key | null;
  }
  export type Key = string | number;
  export type JSXElementConstructor<P> = ((props: P) => ReactElement | null) | (new (props: P) => Component<P, any>);
  export class Component<P = {}, S = {}> {
    props: Readonly<P>;
    state: Readonly<S>;
    setState<K extends keyof S>(state: Pick<S, K>): void;
    render(): ReactNode;
  }
  export function useState<T>(initialState: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly any[]): T;
  export function useMemo<T>(factory: () => T, deps: readonly any[]): T;
  export function useRef<T>(initialValue: T): { current: T };
  export function useContext<T>(context: Context<T>): T;
  export function useReducer<R extends Reducer<any, any>>(reducer: R, initialState: ReducerState<R>): [ReducerState<R>, Dispatch<ReducerAction<R>>];
  export function createContext<T>(defaultValue: T): Context<T>;
  export interface Context<T> {
    Provider: Provider<T>;
    Consumer: Consumer<T>;
    displayName?: string;
  }
  export type Provider<T> = FC<{ value: T; children?: ReactNode }>;
  export type Consumer<T> = FC<{ children: (value: T) => ReactNode }>;
  export type Reducer<S, A> = (prevState: S, action: A) => S;
  export type ReducerState<R extends Reducer<any, any>> = R extends Reducer<infer S, any> ? S : never;
  export type ReducerAction<R extends Reducer<any, any>> = R extends Reducer<any, infer A> ? A : never;
  export type Dispatch<A> = (value: A) => void;
  export function memo<P extends object>(Component: FC<P>): FC<P>;
  export function forwardRef<T, P = {}>(render: (props: P, ref: React.Ref<T>) => ReactElement | null): FC<P & { ref?: React.Ref<T> }>;
  export type Ref<T> = RefCallback<T> | RefObject<T> | null;
  export type RefCallback<T> = (instance: T | null) => void;
  export interface RefObject<T> {
    readonly current: T | null;
  }
  export type PropsWithChildren<P = unknown> = P & { children?: ReactNode };
  export type PropsWithRef<P> = P;
  export type ComponentProps<T extends keyof JSX.IntrinsicElements | JSXElementConstructor<any>> = T extends JSXElementConstructor<infer P> ? P : T extends keyof JSX.IntrinsicElements ? JSX.IntrinsicElements[T] : {};

  // React 19 APIs
  export function use<T>(promise: Promise<T> | Context<T>): T;
  export function useActionState<State>(action: (state: State, formData: FormData) => State | Promise<State>, initialState: State, permalink?: string): [State, (formData: FormData) => void, boolean];
  export function useOptimistic<State>(state: State, updateFn?: (currentState: State, optimisticValue: any) => State): [State, (optimisticValue: any) => void];
  export function useFormStatus(): { pending: boolean; data: FormData | null; method: string | null; action: string | null };
  export function startTransition(callback: () => void): void;
  export function useTransition(): [boolean, (callback: () => void) => void];
  export function useDeferredValue<T>(value: T, initialValue?: T): T;
  export function useId(): string;

  // Suspense & Lazy
  export const Suspense: FC<{ fallback?: ReactNode; children?: ReactNode }>;
  export function lazy<T extends FC<any>>(factory: () => Promise<{ default: T }>): T;
  export const Fragment: FC<{ children?: ReactNode }>;
  export const StrictMode: FC<{ children?: ReactNode }>;

  // Additional hooks
  export function useLayoutEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useImperativeHandle<T>(ref: Ref<T>, createHandle: () => T, deps?: readonly any[]): void;
  export function useDebugValue<T>(value: T, format?: (value: T) => any): void;
  export function useSyncExternalStore<T>(subscribe: (onStoreChange: () => void) => () => void, getSnapshot: () => T, getServerSnapshot?: () => T): T;
  export function useInsertionEffect(effect: () => void | (() => void), deps?: readonly any[]): void;

  // Event types
  export type ChangeEvent<T = Element> = { target: T & { value: string; checked?: boolean; name?: string }; currentTarget: T; preventDefault(): void; stopPropagation(): void };
  export type FormEvent<T = Element> = { target: T; currentTarget: T; preventDefault(): void; stopPropagation(): void };
  export type MouseEvent<T = Element> = { target: T; currentTarget: T; clientX: number; clientY: number; pageX: number; pageY: number; preventDefault(): void; stopPropagation(): void };
  export type KeyboardEvent<T = Element> = { target: T; currentTarget: T; key: string; code: string; altKey: boolean; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; preventDefault(): void; stopPropagation(): void };
  export type FocusEvent<T = Element> = { target: T; currentTarget: T; relatedTarget: EventTarget | null; preventDefault(): void; stopPropagation(): void };
  export type DragEvent<T = Element> = { target: T; currentTarget: T; dataTransfer: DataTransfer; preventDefault(): void; stopPropagation(): void };
  export type ClipboardEvent<T = Element> = { target: T; currentTarget: T; clipboardData: DataTransfer; preventDefault(): void; stopPropagation(): void };
  export type TouchEvent<T = Element> = { target: T; currentTarget: T; touches: TouchList; preventDefault(): void; stopPropagation(): void };
  export type WheelEvent<T = Element> = MouseEvent<T> & { deltaX: number; deltaY: number; deltaZ: number; deltaMode: number };

  // CSSProperties
  export interface CSSProperties {
    [key: string]: string | number | undefined;
  }

  // createPortal
  export function createPortal(children: ReactNode, container: Element, key?: string): ReactElement;
}

declare namespace JSX {
  interface Element extends React.ReactElement<any, any> {}
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
`;

  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    reactTypes,
    'file:///node_modules/@types/react/index.d.ts'
  );

  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    reactTypes,
    'file:///node_modules/@types/react/index.d.ts'
  );
}

/**
 * Add common library type definitions
 */
export function addCommonLibTypes(monaco: Monaco): void {
  // Zustand types
  const zustandTypes = `
declare module 'zustand' {
  export type StateCreator<T, Mis extends [StoreMutatorIdentifier, unknown][] = [], Mos extends [StoreMutatorIdentifier, unknown][] = [], U = T> = 
    (set: SetState<T>, get: GetState<T>, api: StoreApi<T>) => U;
  export type SetState<T> = (partial: T | Partial<T> | ((state: T) => T | Partial<T>), replace?: boolean) => void;
  export type GetState<T> = () => T;
  export interface StoreApi<T> {
    setState: SetState<T>;
    getState: GetState<T>;
    subscribe: (listener: (state: T, prevState: T) => void) => () => void;
    destroy: () => void;
  }
  export type StoreMutatorIdentifier = string;
  export function create<T>(initializer: StateCreator<T>): UseBoundStore<StoreApi<T>>;
  export type UseBoundStore<S extends StoreApi<unknown>> = {
    (): ExtractState<S>;
    <U>(selector: (state: ExtractState<S>) => U): U;
  } & S;
  export type ExtractState<S> = S extends StoreApi<infer T> ? T : never;
}

declare module 'zustand/middleware' {
  export function persist<T>(
    config: StateCreator<T>,
    options: { name: string; storage?: any }
  ): StateCreator<T>;
  export function devtools<T>(config: StateCreator<T>): StateCreator<T>;
  export function subscribeWithSelector<T>(config: StateCreator<T>): StateCreator<T>;
}
`;

  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    zustandTypes,
    'file:///node_modules/zustand/index.d.ts'
  );

  // Next.js types
  const nextTypes = `
declare module 'next/link' {
  import { FC, AnchorHTMLAttributes } from 'react';
  export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string;
    as?: string;
    replace?: boolean;
    scroll?: boolean;
    shallow?: boolean;
    passHref?: boolean;
    prefetch?: boolean;
    locale?: string | false;
  }
  const Link: FC<LinkProps>;
  export default Link;
}

declare module 'next/image' {
  import { FC, ImgHTMLAttributes } from 'react';
  export interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    fill?: boolean;
    loader?: ImageLoader;
    quality?: number;
    priority?: boolean;
    loading?: 'lazy' | 'eager';
    placeholder?: 'blur' | 'empty';
    blurDataURL?: string;
    sizes?: string;
    style?: React.CSSProperties;
  }
  export type ImageLoader = (resolverProps: ImageLoaderProps) => string;
  export interface ImageLoaderProps {
    src: string;
    width: number;
    quality?: number;
  }
  const Image: FC<ImageProps>;
  export default Image;
}

declare module 'next/navigation' {
  export function useRouter(): {
    push(href: string, options?: { scroll?: boolean }): void;
    replace(href: string, options?: { scroll?: boolean }): void;
    prefetch(href: string): void;
    back(): void;
    forward(): void;
    refresh(): void;
  };
  export function usePathname(): string;
  export function useSearchParams(): URLSearchParams;
  export function useParams(): Record<string, string | string[]>;
}
`;

  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    nextTypes,
    'file:///node_modules/next/index.d.ts'
  );

  // Tailwind CSS utility types
  const tailwindTypes = `
declare module 'clsx' {
  export type ClassValue = ClassArray | ClassDictionary | string | number | null | boolean | undefined;
  export type ClassDictionary = Record<string, any>;
  export type ClassArray = ClassValue[];
  export function clsx(...inputs: ClassValue[]): string;
  export default clsx;
}

declare module 'tailwind-merge' {
  export function twMerge(...classLists: (string | undefined | null | false)[]): string;
  export function twJoin(...classLists: (string | undefined | null | false)[]): string;
}

declare module 'class-variance-authority' {
  export type VariantProps<T extends (...args: any) => any> = Omit<Parameters<T>[0], 'class' | 'className'>;
  export function cva(base?: string, config?: {
    variants?: Record<string, Record<string, string>>;
    compoundVariants?: Array<Record<string, string> & { class?: string; className?: string }>;
    defaultVariants?: Record<string, string>;
  }): (props?: Record<string, any>) => string;
}
`;

  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    tailwindTypes,
    'file:///node_modules/clsx/index.d.ts'
  );

  // Vercel AI SDK types
  const aiSdkTypes = `
declare module 'ai' {
  import { ReactNode } from 'react';

  export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system' | 'function' | 'data' | 'tool';
    content: string;
    createdAt?: Date;
    name?: string;
    function_call?: { name: string; arguments: string };
    tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
    annotations?: any[];
    parts?: Array<{ type: string; text?: string; toolCallId?: string; toolName?: string; args?: any; result?: any }>;
  }

  export interface UseChatOptions {
    api?: string;
    id?: string;
    initialMessages?: Message[];
    initialInput?: string;
    body?: Record<string, any>;
    headers?: Record<string, string>;
    onResponse?: (response: Response) => void | Promise<void>;
    onFinish?: (message: Message) => void;
    onError?: (error: Error) => void;
    sendExtraMessageFields?: boolean;
    maxSteps?: number;
  }

  export interface UseChatHelpers {
    messages: Message[];
    input: string;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    handleSubmit: (e?: React.FormEvent<HTMLFormElement>) => void;
    setMessages: (messages: Message[] | ((messages: Message[]) => Message[])) => void;
    setInput: (input: string) => void;
    append: (message: Message | { role: 'user'; content: string }) => Promise<string | null | undefined>;
    reload: () => Promise<string | null | undefined>;
    stop: () => void;
    isLoading: boolean;
    error: Error | undefined;
    data?: any[];
    addToolResult: (result: { toolCallId: string; result: any }) => void;
  }

  export function useChat(options?: UseChatOptions): UseChatHelpers;

  export interface UseCompletionOptions {
    api?: string;
    id?: string;
    initialCompletion?: string;
    body?: Record<string, any>;
    headers?: Record<string, string>;
    onResponse?: (response: Response) => void | Promise<void>;
    onFinish?: (prompt: string, completion: string) => void;
    onError?: (error: Error) => void;
  }

  export interface UseCompletionHelpers {
    completion: string;
    input: string;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    handleSubmit: (e?: React.FormEvent<HTMLFormElement>) => void;
    setInput: (input: string) => void;
    setCompletion: (completion: string) => void;
    complete: (prompt: string) => Promise<string | null | undefined>;
    stop: () => void;
    isLoading: boolean;
    error: Error | undefined;
  }

  export function useCompletion(options?: UseCompletionOptions): UseCompletionHelpers;

  export type StreamableValue<T = any> = {
    readonly current: T | undefined;
    readonly error: Error | undefined;
    readonly done: boolean;
  };

  export function readStreamableValue<T>(stream: StreamableValue<T>): AsyncIterable<T | undefined>;
  export function useStreamableValue<T>(stream: StreamableValue<T>): [T | undefined, Error | undefined, boolean];

  export function streamText(options: any): any;
  export function generateText(options: any): Promise<any>;
  export function generateObject(options: any): Promise<any>;
  export function tool(config: any): any;
}

declare module 'ai/react' {
  export { useChat, useCompletion, useStreamableValue } from 'ai';
}
`;

  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    aiSdkTypes,
    'file:///node_modules/ai/index.d.ts'
  );

  // Testing types (Jest / Vitest)
  const testingTypes = `
declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void | Promise<void>): void;
declare function test(name: string, fn: () => void | Promise<void>): void;
declare function expect<T>(actual: T): {
  toBe(expected: T): void;
  toEqual(expected: any): void;
  toBeDefined(): void;
  toBeUndefined(): void;
  toBeNull(): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toContain(item: any): void;
  toHaveLength(length: number): void;
  toThrow(error?: string | RegExp | Error): void;
  toHaveBeenCalled(): void;
  toHaveBeenCalledTimes(times: number): void;
  toHaveBeenCalledWith(...args: any[]): void;
  toMatchObject(obj: any): void;
  toMatchSnapshot(): void;
  toMatchInlineSnapshot(snapshot?: string): void;
  toBeGreaterThan(num: number): void;
  toBeGreaterThanOrEqual(num: number): void;
  toBeLessThan(num: number): void;
  toBeLessThanOrEqual(num: number): void;
  toBeCloseTo(num: number, numDigits?: number): void;
  toHaveProperty(path: string, value?: any): void;
  toBeInstanceOf(constructor: Function): void;
  resolves: any;
  rejects: any;
  not: any;
};
declare function beforeEach(fn: () => void | Promise<void>): void;
declare function afterEach(fn: () => void | Promise<void>): void;
declare function beforeAll(fn: () => void | Promise<void>): void;
declare function afterAll(fn: () => void | Promise<void>): void;
declare namespace jest {
  function fn<T extends (...args: any[]) => any>(implementation?: T): T & { mock: { calls: any[][]; results: any[]; instances: any[] }; mockReturnValue(value: any): any; mockResolvedValue(value: any): any; mockRejectedValue(value: any): any; mockImplementation(fn: T): any; mockClear(): void; mockReset(): void; mockRestore(): void };
  function spyOn(object: any, method: string): any;
  function mock(moduleName: string, factory?: () => any): any;
  function clearAllMocks(): void;
  function resetAllMocks(): void;
  function restoreAllMocks(): void;
  function useFakeTimers(): void;
  function useRealTimers(): void;
  function advanceTimersByTime(ms: number): void;
  function runAllTimers(): void;
}
`;

  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    testingTypes,
    'file:///node_modules/@types/jest/index.d.ts'
  );

  // Common utility library types
  const utilityTypes = `
declare module 'nanoid' {
  export function nanoid(size?: number): string;
}

declare module 'sonner' {
  import { FC, ReactNode } from 'react';
  export const Toaster: FC<{
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
    richColors?: boolean;
    expand?: boolean;
    duration?: number;
    theme?: 'light' | 'dark' | 'system';
    closeButton?: boolean;
  }>;
  export const toast: {
    (message: string | ReactNode): string | number;
    success: (message: string | ReactNode) => string | number;
    error: (message: string | ReactNode) => string | number;
    warning: (message: string | ReactNode) => string | number;
    info: (message: string | ReactNode) => string | number;
    loading: (message: string | ReactNode) => string | number;
    promise: <T>(promise: Promise<T>, options: { loading: string; success: string | ((data: T) => string); error: string | ((error: Error) => string) }) => string | number;
    dismiss: (id?: string | number) => void;
    custom: (component: ReactNode) => string | number;
  };
}

declare module 'date-fns' {
  export function format(date: Date | number | string, formatStr: string, options?: any): string;
  export function formatDistance(date: Date | number, baseDate: Date | number, options?: any): string;
  export function formatRelative(date: Date | number, baseDate: Date | number, options?: any): string;
  export function parseISO(dateString: string): Date;
  export function isAfter(date: Date | number, dateToCompare: Date | number): boolean;
  export function isBefore(date: Date | number, dateToCompare: Date | number): boolean;
  export function addDays(date: Date | number, amount: number): Date;
  export function subDays(date: Date | number, amount: number): Date;
  export function addHours(date: Date | number, amount: number): Date;
  export function addMinutes(date: Date | number, amount: number): Date;
  export function differenceInDays(dateLeft: Date | number, dateRight: Date | number): number;
  export function differenceInHours(dateLeft: Date | number, dateRight: Date | number): number;
  export function differenceInMinutes(dateLeft: Date | number, dateRight: Date | number): number;
  export function differenceInSeconds(dateLeft: Date | number, dateRight: Date | number): number;
  export function startOfDay(date: Date | number): Date;
  export function endOfDay(date: Date | number): Date;
  export function isValid(date: any): boolean;
  export function isToday(date: Date | number): boolean;
  export function isPast(date: Date | number): boolean;
  export function isFuture(date: Date | number): boolean;
}

declare module 'zod' {
  export const z: {
    string: () => any;
    number: () => any;
    boolean: () => any;
    date: () => any;
    bigint: () => any;
    symbol: () => any;
    undefined: () => any;
    null: () => any;
    void: () => any;
    any: () => any;
    unknown: () => any;
    never: () => any;
    literal: (value: any) => any;
    enum: (values: [string, ...string[]]) => any;
    nativeEnum: (enumType: any) => any;
    object: (shape: Record<string, any>) => any;
    array: (schema: any) => any;
    tuple: (schemas: any[]) => any;
    union: (schemas: any[]) => any;
    discriminatedUnion: (discriminator: string, schemas: any[]) => any;
    intersection: (left: any, right: any) => any;
    record: (keySchema: any, valueSchema?: any) => any;
    map: (keySchema: any, valueSchema: any) => any;
    set: (schema: any) => any;
    function: (args?: any, returns?: any) => any;
    lazy: (getter: () => any) => any;
    promise: (schema: any) => any;
    optional: (schema: any) => any;
    nullable: (schema: any) => any;
    coerce: { string: () => any; number: () => any; boolean: () => any; date: () => any; bigint: () => any };
    infer: any;
    input: any;
    output: any;
  };
  export type infer<T> = T extends { _output: infer O } ? O : never;
}
`;

  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    utilityTypes,
    'file:///node_modules/@types/utilities/index.d.ts'
  );
}

/**
 * Full TypeScript setup for Monaco
 */
export function setupTypeScript(monaco: Monaco): void {
  configureTypeScriptDefaults(monaco);
  addReactTypes(monaco);
  addCommonLibTypes(monaco);
}
