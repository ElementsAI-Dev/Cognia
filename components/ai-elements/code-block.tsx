"use client";

import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";
import { PanelRightOpen, Download } from "lucide-react";
import { useArtifactStore } from "@/stores";
import { ArtifactCreateButton } from "@/components/artifacts/artifact-create-button";
import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { type BundledLanguage, codeToHtml, type ShikiTransformer } from "shiki";

type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language: BundledLanguage;
  showLineNumbers?: boolean;
  showCanvasButton?: boolean;
  title?: string;
};

type CodeBlockContextType = {
  code: string;
};

const CodeBlockContext = createContext<CodeBlockContextType>({
  code: "",
});

const lineNumberTransformer: ShikiTransformer = {
  name: "line-numbers",
  line(node, line) {
    node.children.unshift({
      type: "element",
      tagName: "span",
      properties: {
        className: [
          "inline-block",
          "min-w-10",
          "mr-4",
          "text-right",
          "select-none",
          "text-muted-foreground",
        ],
      },
      children: [{ type: "text", value: String(line) }],
    });
  },
};

export async function highlightCode(
  code: string,
  language: BundledLanguage,
  showLineNumbers = false
) {
  const transformers: ShikiTransformer[] = showLineNumbers
    ? [lineNumberTransformer]
    : [];

  return await Promise.all([
    codeToHtml(code, {
      lang: language,
      theme: "one-light",
      transformers,
    }),
    codeToHtml(code, {
      lang: language,
      theme: "one-dark-pro",
      transformers,
    }),
  ]);
}

export const CodeBlock = ({
  code,
  language,
  showLineNumbers = false,
  showCanvasButton = true,
  title,
  className,
  children,
  ...props
}: CodeBlockProps) => {
  const t = useTranslations('renderer');
  const [html, setHtml] = useState<string>("");
  const [darkHtml, setDarkHtml] = useState<string>("");
  const mounted = useRef(false);
  
  const createCanvasDocument = useArtifactStore((state) => state.createCanvasDocument);
  const openPanel = useArtifactStore((state) => state.openPanel);

  useEffect(() => {
    highlightCode(code, language, showLineNumbers).then(([light, dark]) => {
      if (!mounted.current) {
        setHtml(light);
        setDarkHtml(dark);
        mounted.current = true;
      }
    });

    return () => {
      mounted.current = false;
    };
  }, [code, language, showLineNumbers]);

  const handleOpenInCanvas = () => {
    createCanvasDocument({
      title: title || `Code - ${language}`,
      content: code,
      type: 'code',
      language: language as import('@/types').ArtifactLanguage,
    });
    openPanel('canvas');
  };

  const handleDownload = () => {
    const extensionMap: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      html: 'html',
      css: 'css',
      json: 'json',
      markdown: 'md',
      jsx: 'jsx',
      tsx: 'tsx',
      sql: 'sql',
      bash: 'sh',
      yaml: 'yaml',
      xml: 'xml',
    };
    const ext = extensionMap[language] || 'txt';
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <CodeBlockContext.Provider value={{ code }}>
      <div
        className={cn(
          "group relative w-full overflow-hidden rounded-md border bg-background text-foreground",
          className
        )}
        {...props}
      >
        {/* Language badge header */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/30">
          <Badge variant="secondary" className="text-xs font-mono">
            {language}
          </Badge>
          {title && <span className="text-xs text-muted-foreground truncate ml-2">{title}</span>}
        </div>
        <div className="relative">
          <div
            className="overflow-auto dark:hidden [&>pre]:m-0 [&>pre]:bg-background! [&>pre]:p-4 [&>pre]:text-foreground! [&>pre]:text-sm [&_code]:font-mono [&_code]:text-sm"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: "this is needed."
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <div
            className="hidden overflow-auto dark:block [&>pre]:m-0 [&>pre]:bg-background! [&>pre]:p-4 [&>pre]:text-foreground! [&>pre]:text-sm [&_code]:font-mono [&_code]:text-sm"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: "this is needed."
            dangerouslySetInnerHTML={{ __html: darkHtml }}
          />
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {showCanvasButton && (
              <Button
                className="shrink-0"
                onClick={handleOpenInCanvas}
                size="icon"
                variant="ghost"
                title={t('openInCanvas')}
              >
                <PanelRightOpen size={14} />
              </Button>
            )}
            <Button
              className="shrink-0"
              onClick={handleDownload}
              size="icon"
              variant="ghost"
              title={t('downloadCode')}
            >
              <Download size={14} />
            </Button>
            <ArtifactCreateButton
              content={code}
              language={language}
              title={title}
              variant="icon"
              className="shrink-0"
            />
            {children}
          </div>
        </div>
      </div>
    </CodeBlockContext.Provider>
  );
};

export type CodeBlockCopyButtonProps = Omit<ComponentProps<typeof CopyButton>, 'content'> & {
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
};

export const CodeBlockCopyButton = ({
  onCopy,
  onError,
  timeout = 2000,
  className,
  ...props
}: CodeBlockCopyButtonProps) => {
  const t = useTranslations('renderer');
  const { code } = useContext(CodeBlockContext);

  return (
    <CopyButton
      content={code}
      iconOnly
      tooltip={t('copyCode')}
      successDuration={timeout}
      onCopySuccess={onCopy}
      onCopyError={onError}
      className={cn("shrink-0", className)}
      {...props}
    />
  );
};
