import { useRef, useState } from 'react';
import { faTrashCan } from '@fortawesome/free-solid-svg-icons/faTrashCan';
import { faArrowUpFromBracket } from '@fortawesome/free-solid-svg-icons/faArrowUpFromBracket';
import { faCopy } from '@fortawesome/free-solid-svg-icons/faCopy';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Field, Input } from '@/components/ui/Input';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/Select';
import { Slider } from '@/components/ui/Slider';
import { Toggle } from '@/components/ui/Toggle';
import {
  getPainting,
  giveCommand,
  MAX_CUSTOM_BLOCKS,
  paintingImage,
  sizeLabel,
  supportsTitleAndAuthor,
  type McVersion,
} from '../lib/paintings';
import {
  artProblem,
  artSize,
  IMAGE_ACCEPT,
  isValidId,
  MAX_ZOOM,
  outputSize,
  PX_PER_BLOCK_OPTIONS,
  sanitizeId,
  type Art,
  type ImageSettings,
} from '../lib/project';
import { ArtPreview } from './ArtPreview';
import { CropEditor } from './CropEditor';

interface ArtPanelProps {
  art: Art;
  version: McVersion;
  duplicateId: boolean;
  onChange: (patch: Partial<Art>) => void;
  onReplaceFile: (file: File) => void;
  onRemove: () => void;
}

export function ArtPanel({ art, version, duplicateId, onChange, onReplaceFile, onRemove }: ArtPanelProps) {
  const s = art.settings;
  const set = (patch: Partial<ImageSettings>) => onChange({ settings: { ...s, ...patch } });
  const fileRef = useRef<HTMLInputElement>(null);
  const meta = art.kind === 'vanilla' ? getPainting(art.paintingId) : undefined;
  const problem = artProblem(art, version);
  const blocks = artSize(art);
  const out = outputSize(art);
  const pxOptions = [...new Set([...PX_PER_BLOCK_OPTIONS, s.pxPerBlock])]
    .sort((a, b) => a - b)
    .map((n) => ({ value: String(n), label: `${n} px per block${n === 16 ? ' (vanilla)' : ''}` }));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        {meta && (
          <img
            src={paintingImage(meta.id)}
            alt=""
            className="pixelated h-12 w-auto max-w-[72px] shrink-0 rounded-[3px] outline outline-2 outline-[var(--color-ink)]"
          />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[22px] font-semibold leading-tight truncate">
            {meta ? meta.title : art.kind === 'custom' ? art.title || 'Untitled painting' : ''}
          </h3>
          <p className="text-[13px] text-[var(--color-fg-muted)] truncate" title={art.fileName}>
            {sizeLabel(blocks.width, blocks.height)} blocks · {art.fileName}
          </p>
        </div>
      </div>

      {(problem || duplicateId) && (
        <p className="rounded-[12px] border-2 border-[var(--color-danger)] px-3 py-2 text-[13px] text-[var(--color-danger)]">
          {problem ?? 'Another painting already uses this namespace and id.'}
        </p>
      )}

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[13px] font-medium">In game</span>
          <span className="text-[12px] text-[var(--color-fg-subtle)] tabular-nums">
            {out.width}×{out.height} px
          </span>
        </div>
        <div className="grid place-items-center rounded-[14px] bg-[var(--color-surface)] p-3">
          <div
            className="overflow-hidden rounded-[3px] outline outline-2 outline-[var(--color-ink)]"
            style={{
              aspectRatio: `${blocks.width} / ${blocks.height}`,
              // At most 200px tall, and never wider than the panel.
              width: `min(100%, calc(200px * ${blocks.width / blocks.height}))`,
            }}
          >
            <ArtPreview art={art} maxPx={1024} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-medium">Fit</span>
          <Segmented
            value={s.fit}
            onChange={(fit) => set({ fit })}
            options={[
              { value: 'crop', label: 'Crop' },
              { value: 'stretch', label: 'Stretch' },
            ]}
          />
        </div>
        {s.fit === 'crop' ? (
          <>
            <CropEditor art={art} onChange={set} />
            <p className="text-[12px] text-[var(--color-fg-subtle)]">
              Drag the frame to choose what shows. Scroll or use the slider to zoom; double-click to reset.
            </p>
            <Field label="Zoom" hint={`${s.zoom.toFixed(1)}×`}>
              <Slider min={1} max={MAX_ZOOM} step={0.05} value={s.zoom} onChange={(e) => set({ zoom: Number(e.target.value) })} />
            </Field>
          </>
        ) : (
          <p className="text-[12px] text-[var(--color-fg-subtle)]">
            The whole image is squeezed into the painting's shape, so it may look squashed.
          </p>
        )}
      </div>

      <Field label="Detail" hint={out.width > 2048 || out.height > 2048 ? 'very large, may not load on older GPUs' : undefined}>
        <Select value={String(s.pxPerBlock)} options={pxOptions} onChange={(e) => set({ pxPerBlock: Number(e.target.value) })} />
      </Field>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[13px] font-medium">Scaling</div>
          <div className="text-[12.5px] text-[var(--color-fg-subtle)]">
            {s.filter === 'smooth' ? 'Best for photos and paintings.' : 'Keeps hard pixel edges for pixel art.'}
          </div>
        </div>
        <Segmented
          value={s.filter}
          onChange={(filter) => set({ filter })}
          options={[
            { value: 'smooth', label: 'Smooth' },
            { value: 'sharp', label: 'Sharp' },
          ]}
        />
      </div>

      {art.kind === 'custom' && (
        <div className="space-y-3 border-t-2 border-dashed border-[var(--color-border-hi)] pt-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Width" hint="blocks">
              <Input
                type="number"
                min={1}
                max={MAX_CUSTOM_BLOCKS}
                value={art.width}
                onChange={(e) => onChange({ width: blockCount(e.target.value) })}
              />
            </Field>
            <Field label="Height" hint="blocks">
              <Input
                type="number"
                min={1}
                max={MAX_CUSTOM_BLOCKS}
                value={art.height}
                onChange={(e) => onChange({ height: blockCount(e.target.value) })}
              />
            </Field>
          </div>
          {supportsTitleAndAuthor(version) ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Title">
                <Input value={art.title} onChange={(e) => onChange({ title: e.target.value })} />
              </Field>
              <Field label="Artist" hint="optional">
                <Input value={art.author} onChange={(e) => onChange({ author: e.target.value })} />
              </Field>
            </div>
          ) : (
            <Field label="Title" hint="for this tool only">
              <Input value={art.title} onChange={(e) => onChange({ title: e.target.value })} />
            </Field>
          )}
          <Field label="Namespace and id" hint="a–z, 0–9, _">
            <div className="flex items-center gap-1.5">
              <Input
                value={art.namespace}
                aria-invalid={!isValidId(art.namespace)}
                onChange={(e) => onChange({ namespace: e.target.value })}
                onBlur={() => onChange({ namespace: sanitizeId(art.namespace) || 'custom' })}
                className="min-w-0 flex-[4] font-mono text-[13px]"
              />
              <span className="text-[var(--color-fg-subtle)]">:</span>
              <Input
                value={art.id}
                aria-invalid={!isValidId(art.id)}
                onChange={(e) => onChange({ id: e.target.value })}
                onBlur={() => onChange({ id: sanitizeId(art.id) || 'painting' })}
                className="min-w-0 flex-[5] font-mono text-[13px]"
              />
            </div>
          </Field>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[13px] font-medium">Random placement</div>
              <div className="text-[12.5px] text-[var(--color-fg-subtle)]">Can show up when you hang a plain painting.</div>
            </div>
            <Toggle checked={art.placeable} onChange={(placeable) => onChange({ placeable })} ariaLabel="Random placement" />
          </div>
          <GiveCommand command={giveCommand(version, `${art.namespace}:${art.id}`)} />
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t-2 border-dashed border-[var(--color-border-hi)] pt-5">
        <Button leading={<Icon icon={faArrowUpFromBracket} size={12} />} onClick={() => fileRef.current?.click()}>
          Replace image
        </Button>
        <Button variant="danger" leading={<Icon icon={faTrashCan} size={12} />} onClick={onRemove}>
          Remove
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept={IMAGE_ACCEPT}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onReplaceFile(f);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

/** Keep typed block counts in range; an empty field falls back to 1. */
const blockCount = (v: string) => Math.min(MAX_CUSTOM_BLOCKS, Math.max(1, Math.round(Number(v) || 1)));

function GiveCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="text-[13px] font-medium">Get it in game</div>
      <div className="flex items-stretch gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-[12px] bg-[var(--color-surface)] px-3 py-2 font-mono text-[12px]">
          {command}
        </code>
        <Button
          size="sm"
          className="self-center"
          leading={<Icon icon={faCopy} size={11} />}
          onClick={() => {
            void navigator.clipboard?.writeText(command).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <p className="text-[12px] text-[var(--color-fg-subtle)]">Needs the datapack installed in the world.</p>
    </div>
  );
}
