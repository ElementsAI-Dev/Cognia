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
}

/**
 * Full TypeScript setup for Monaco
 */
export function setupTypeScript(monaco: Monaco): void {
  configureTypeScriptDefaults(monaco);
  addReactTypes(monaco);
  addCommonLibTypes(monaco);
}
