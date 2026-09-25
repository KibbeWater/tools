import { useEffect, useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { FileDrop } from '@/components/ui/FileDrop';
import { Slider } from '@/components/ui/Slider';
import { Toggle } from '@/components/ui/Toggle';
import { Field, Input } from '@/components/ui/Input';
import { defaultReplacement, type DiscReplacement } from '../lib/state';
import { discImage, type DiscMeta } from '../lib/discs';

interface DiscConfigSheetProps {
  open: boolean;
  onClose: () => void;
  /**
   * Disc the user is configuring. If `existing` is set, we're editing; otherwise we're creating.
   */
  disc: DiscMeta | null;
  existing?: DiscReplacement | null;
  onConfirm: (item: DiscReplacement) => void;
}

export function DiscConfigSheet({
  open,
  onClose,
  disc,
  existing,
  onConfirm,
}: DiscConfigSheetProps) {
  const [state, setState] = useState<DiscReplacement | null>(null);

  // Reset when the target disc or existing item changes.
  useEffect(() => {
    if (!disc) {
      setState(null);
      return;
    }
    if (existing) setState({ ...existing });
    else setState(null); // wait for a file drop
  }, [disc, existing, open]);

  const setFile = (file: File) => {
    if (!disc) return;
    setState((prev) =>
      prev ? { ...prev, source: file } : defaultReplacement(disc, file),
    );
  };

  const isValid = !!state && !!state.source;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        disc ? (
          <span className="flex items-center gap-3">
            <img src={discImage(disc.id)} alt="" width={44} height={44} className="pixelated w-11 h-11 -my-2" />
            Replace “{disc.label}”
          </span>
        ) : (
          'Configure disc'
        )
      }
      description={
        disc?.composer ? `Original track by ${disc.composer}.` : undefined
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!isValid}
            onClick={() => state && onConfirm(state)}
          >
            {existing ? 'Save changes' : 'Add replacement'}
          </Button>
        </>
      }
    >
      {!state ? (
        <FileDrop
          accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a,.aac"
          onFiles={(files) => files[0] && setFile(files[0])}
          label="Drop an audio file, or click to browse"
          sublabel="MP3, WAV, FLAC, OGG or M4A. It gets converted to OGG Vorbis for Minecraft."
        />
      ) : (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <div className="min-w-0">
              <div className="text-[12.5px] text-[var(--color-fg-subtle)]">Source file</div>
              <div className="text-[14px] text-[var(--color-fg)] truncate">
                {state.source.name}
              </div>
              <div className="text-[12.5px] text-[var(--color-fg-subtle)] mt-0.5 tabular-nums">
                {formatBytes(state.source.size)}
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setState(null)}
            >
              Change
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Trim start (s)">
              <Input
                type="number"
                min={0}
                step={0.1}
                value={state.trimStart}
                onChange={(e) =>
                  setState({ ...state, trimStart: Number(e.target.value) || 0 })
                }
              />
            </Field>
            <Field label="Trim end (s)" hint="0 = end">
              <Input
                type="number"
                min={0}
                step={0.1}
                value={state.trimEnd}
                onChange={(e) =>
                  setState({ ...state, trimEnd: Number(e.target.value) || 0 })
                }
              />
            </Field>
          </div>

          <Field label="Gain" hint={`${state.gainDb.toFixed(1)} dB`}>
            <Slider
              min={-18}
              max={12}
              step={0.5}
              value={state.gainDb}
              onChange={(e) => setState({ ...state, gainDb: Number(e.target.value) })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fade in (s)">
              <Slider
                min={0}
                max={5}
                step={0.1}
                showValue
                formatValue={(v) => v.toFixed(1)}
                value={state.fadeInSec}
                onChange={(e) =>
                  setState({ ...state, fadeInSec: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Fade out (s)">
              <Slider
                min={0}
                max={5}
                step={0.1}
                showValue
                formatValue={(v) => v.toFixed(1)}
                value={state.fadeOutSec}
                onChange={(e) =>
                  setState({ ...state, fadeOutSec: Number(e.target.value) })
                }
              />
            </Field>
          </div>

          <Field label="OGG Vorbis quality" hint={`q${state.quality.toFixed(1)}`}>
            <Slider
              min={-1}
              max={10}
              step={0.5}
              value={state.quality}
              onChange={(e) => setState({ ...state, quality: Number(e.target.value) })}
            />
          </Field>

          <div className="flex items-center justify-between gap-4 pt-4 border-t border-[var(--color-border)]">
            <div>
              <div className="text-[13px] font-medium text-[var(--color-fg)]">Mono downmix</div>
              <div className="text-[12.5px] text-[var(--color-fg-subtle)]">
                Discs play non-positionally, so stereo is fine.
              </div>
            </div>
            <Toggle
              checked={state.mono}
              onChange={(v) => setState({ ...state, mono: v })}
              ariaLabel="Mono downmix"
            />
          </div>
        </div>
      )}
    </Sheet>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
