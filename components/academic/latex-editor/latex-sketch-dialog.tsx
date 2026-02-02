'use client';

/**
 * LaTeX Sketch Dialog - Draw mathematical expressions and convert to LaTeX
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Pencil,
  Eraser,
  RotateCcw,
  Loader2,
  Check,
  Wand2,
  Copy,
} from 'lucide-react';
import {
  SketchToLaTeXService,
  type Stroke,
  type Point,
  strokesToImageDataURL,
} from '@/lib/latex';
import { cn } from '@/lib/utils';

export interface LatexSketchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (latex: string) => void;
}

type Tool = 'pen' | 'eraser';

export function LatexSketchDialog({
  open,
  onOpenChange,
  onInsert,
}: LatexSketchDialogProps) {
  const t = useTranslations('latex');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [tool, setTool] = useState<Tool>('pen');
  const [hint, setHint] = useState('');
  const [recognizedLatex, setRecognizedLatex] = useState('');
  const [alternatives, setAlternatives] = useState<{ latex: string; confidence: number }[]>([]);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [copied, setCopied] = useState(false);

  const service = useRef(new SketchToLaTeXService({ provider: 'local' }));

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 300;

    // Clear and set background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw existing strokes
    ctx.strokeStyle = '#000000';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of strokes) {
      if (stroke.points.length === 0) continue;
      ctx.lineWidth = stroke.width;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, [strokes, open]);

  const getCanvasPoint = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      timestamp: Date.now(),
    };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (tool === 'eraser') {
        // Eraser mode - remove strokes near click
        const point = getCanvasPoint(e);
        setStrokes((prev) =>
          prev.filter((stroke) => {
            return !stroke.points.some(
              (p) => Math.abs(p.x - point.x) < 10 && Math.abs(p.y - point.y) < 10
            );
          })
        );
        return;
      }

      setIsDrawing(true);
      const point = getCanvasPoint(e);
      setCurrentStroke([point]);
    },
    [tool, getCanvasPoint]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || tool === 'eraser') return;

      const point = getCanvasPoint(e);
      setCurrentStroke((prev) => [...prev, point]);

      // Draw current stroke
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) return;

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (currentStroke.length > 0) {
        const lastPoint = currentStroke[currentStroke.length - 1];
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }
    },
    [isDrawing, tool, getCanvasPoint, currentStroke]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentStroke.length > 1) {
      setStrokes((prev) => [
        ...prev,
        {
          points: currentStroke,
          color: '#000000',
          width: 2,
          timestamp: Date.now(),
        },
      ]);
    }
    setCurrentStroke([]);
  }, [isDrawing, currentStroke]);

  const handleClear = useCallback(() => {
    setStrokes([]);
    setCurrentStroke([]);
    setRecognizedLatex('');
    setAlternatives([]);
  }, []);

  const handleRecognize = useCallback(async () => {
    if (strokes.length === 0) return;

    setIsRecognizing(true);
    try {
      const imageData = strokesToImageDataURL(strokes, 400, 300);
      const base64 = imageData.replace(/^data:image\/\w+;base64,/, '');

      const result = await service.current.recognize({
        imageData: base64,
        format: 'png',
        hints: hint ? [hint] : undefined,
      });

      if (result.success) {
        setRecognizedLatex(result.latex);
        setAlternatives(result.alternatives || []);
      }
    } catch (error) {
      console.error('Recognition failed:', error);
    } finally {
      setIsRecognizing(false);
    }
  }, [strokes, hint]);

  const handleCopyLatex = useCallback(async () => {
    if (!recognizedLatex) return;
    await navigator.clipboard.writeText(recognizedLatex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [recognizedLatex]);

  const handleInsert = useCallback(() => {
    if (recognizedLatex) {
      onInsert(recognizedLatex);
      onOpenChange(false);
      handleClear();
    }
  }, [recognizedLatex, onInsert, onOpenChange, handleClear]);

  const handleSelectAlternative = useCallback((latex: string) => {
    setRecognizedLatex(latex);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            {t('sketchInput', { defaultValue: 'Sketch Input' })}
          </DialogTitle>
          <DialogDescription>
            {t('sketchDescription', {
              defaultValue: 'Draw a mathematical expression and convert it to LaTeX',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tools */}
          <div className="flex items-center gap-2">
            <Button
              variant={tool === 'pen' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('pen')}
              className="gap-1"
            >
              <Pencil className="h-4 w-4" />
              {t('pen', { defaultValue: 'Pen' })}
            </Button>
            <Button
              variant={tool === 'eraser' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('eraser')}
              className="gap-1"
            >
              <Eraser className="h-4 w-4" />
              {t('eraser', { defaultValue: 'Eraser' })}
            </Button>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1">
              <RotateCcw className="h-4 w-4" />
              {t('clear', { defaultValue: 'Clear' })}
            </Button>
          </div>

          {/* Canvas */}
          <div className="border rounded-lg overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              className={cn(
                'w-full h-[300px]',
                tool === 'pen' ? 'cursor-crosshair' : 'cursor-pointer'
              )}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>

          {/* Hint Input */}
          <div className="space-y-2">
            <Label htmlFor="hint">
              {t('hint', { defaultValue: 'Hint (optional)' })}
            </Label>
            <Input
              id="hint"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder={t('hintPlaceholder', {
                defaultValue: 'e.g., integral, fraction, matrix',
              })}
            />
          </div>

          <Separator />

          {/* Recognition Result */}
          {recognizedLatex && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('recognizedLatex', { defaultValue: 'Recognized LaTeX' })}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyLatex}
                  className="h-8 gap-1"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <div className="p-3 bg-muted rounded-md font-mono text-sm break-all">
                {recognizedLatex}
              </div>

              {/* Alternatives */}
              {alternatives.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    {t('alternatives', { defaultValue: 'Alternatives' })}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {alternatives.map((alt, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => handleSelectAlternative(alt.latex)}
                      >
                        {alt.latex.slice(0, 20)}...
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleRecognize}
            disabled={strokes.length === 0 || isRecognizing}
            className="gap-2"
          >
            {isRecognizing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            {t('recognize', { defaultValue: 'Recognize' })}
          </Button>
          <Button onClick={handleInsert} disabled={!recognizedLatex}>
            {t('insert', { defaultValue: 'Insert' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LatexSketchDialog;
