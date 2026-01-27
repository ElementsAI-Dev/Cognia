'use client';

/**
 * AudioMixerPanel - Audio mixing and control panel
 * 
 * Features:
 * - Volume control for each track
 * - Pan control (left/right balance)
 * - Mute/solo track controls
 * - Master volume control
 * - Audio level meters
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Volume2,
  VolumeX,
  Headphones,
  Music,
  Mic,
  Radio,
} from 'lucide-react';

export interface AudioTrack {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'music' | 'voiceover';
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  level: number;
}

export interface AudioMixerPanelProps {
  tracks: AudioTrack[];
  masterVolume: number;
  masterMuted: boolean;
  onTrackVolumeChange: (trackId: string, volume: number) => void;
  onTrackPanChange: (trackId: string, pan: number) => void;
  onTrackMuteToggle: (trackId: string) => void;
  onTrackSoloToggle: (trackId: string) => void;
  onMasterVolumeChange: (volume: number) => void;
  onMasterMuteToggle: () => void;
  className?: string;
}

const TRACK_TYPE_ICONS = {
  video: Volume2,
  audio: Music,
  music: Radio,
  voiceover: Mic,
};

export function AudioMixerPanel({
  tracks,
  masterVolume,
  masterMuted,
  onTrackVolumeChange,
  onTrackPanChange,
  onTrackMuteToggle,
  onTrackSoloToggle,
  onMasterVolumeChange,
  onMasterMuteToggle,
  className,
}: AudioMixerPanelProps) {
  const t = useTranslations('audioMixer');
  const [expandedTrack, setExpandedTrack] = useState<string | null>(null);

  const handleVolumeChange = useCallback(
    (trackId: string, value: number[]) => {
      onTrackVolumeChange(trackId, value[0]);
    },
    [onTrackVolumeChange]
  );

  const handlePanChange = useCallback(
    (trackId: string, value: number[]) => {
      onTrackPanChange(trackId, value[0]);
    },
    [onTrackPanChange]
  );

  const formatVolume = (value: number) => {
    if (value === 0) return '-∞';
    const db = 20 * Math.log10(value);
    return `${db.toFixed(1)} dB`;
  };

  const formatPan = (value: number) => {
    if (value === 0) return 'C';
    if (value < 0) return `L${Math.abs(Math.round(value * 100))}`;
    return `R${Math.round(value * 100)}`;
  };

  return (
    <div className={cn('flex flex-col h-full bg-background border rounded-lg', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-medium flex items-center gap-2">
          <Headphones className="h-4 w-4" />
          {t('title')}
        </h3>
      </div>

      {/* Track list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {tracks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('noTracks')}</p>
            </div>
          ) : (
            tracks.map((track) => {
              const Icon = TRACK_TYPE_ICONS[track.type] || Volume2;
              const isExpanded = expandedTrack === track.id;

              return (
                <Card
                  key={track.id}
                  className={cn(
                    'transition-colors',
                    track.muted && 'opacity-50',
                    track.solo && 'ring-1 ring-yellow-500'
                  )}
                >
                  <CardContent className="p-3">
                  {/* Track header */}
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span
                      className="flex-1 text-sm font-medium truncate cursor-pointer"
                      onClick={() => setExpandedTrack(isExpanded ? null : track.id)}
                    >
                      {track.name}
                    </span>
                    
                    {/* Mute button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={track.muted ? 'destructive' : 'ghost'}
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => onTrackMuteToggle(track.id)}
                        >
                          {track.muted ? (
                            <VolumeX className="h-3 w-3" />
                          ) : (
                            <Volume2 className="h-3 w-3" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{track.muted ? t('unmute') : t('mute')}</TooltipContent>
                    </Tooltip>

                    {/* Solo button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={track.solo ? 'default' : 'ghost'}
                          size="icon"
                          className={cn('h-6 w-6', track.solo && 'bg-yellow-500 hover:bg-yellow-600')}
                          onClick={() => onTrackSoloToggle(track.id)}
                        >
                          <span className="text-xs font-bold">S</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{track.solo ? t('unsolo') : t('solo')}</TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Volume slider */}
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[track.volume]}
                      onValueChange={(v) => handleVolumeChange(track.id, v)}
                      min={0}
                      max={1.5}
                      step={0.01}
                      disabled={track.muted}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-12 text-right font-mono">
                      {formatVolume(track.volume)}
                    </span>
                  </div>

                  {/* Level meter */}
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all duration-75',
                        track.level > 0.9 ? 'bg-red-500' : track.level > 0.7 ? 'bg-yellow-500' : 'bg-green-500'
                      )}
                      style={{ width: `${track.level * 100}%` }}
                    />
                  </div>

                  {/* Expanded controls */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      {/* Pan control */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">{t('pan')}</Label>
                          <span className="text-xs text-muted-foreground font-mono">
                            {formatPan(track.pan)}
                          </span>
                        </div>
                        <Slider
                          value={[track.pan]}
                          onValueChange={(v) => handlePanChange(track.id, v)}
                          min={-1}
                          max={1}
                          step={0.01}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{t('left')}</span>
                          <span>{t('center')}</span>
                          <span>{t('right')}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Master volume */}
      <div className="p-3 border-t bg-muted/30">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium">{t('master')}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={masterMuted ? 'destructive' : 'ghost'}
                size="icon"
                className="h-6 w-6 ml-auto"
                onClick={onMasterMuteToggle}
              >
                {masterMuted ? (
                  <VolumeX className="h-3 w-3" />
                ) : (
                  <Volume2 className="h-3 w-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{masterMuted ? t('unmute') : t('mute')}</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          <Slider
            value={[masterVolume]}
            onValueChange={(v) => onMasterVolumeChange(v[0])}
            min={0}
            max={1.5}
            step={0.01}
            disabled={masterMuted}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-12 text-right font-mono">
            {formatVolume(masterVolume)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default AudioMixerPanel;
