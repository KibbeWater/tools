import { useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useHotkey } from '@tanstack/react-hotkeys';
import { Button } from '@/components/ui/Button';
import { Kbd } from '@/components/ui/Kbd';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { FileDrop } from '@/components/ui/FileDrop';
import { withViewTransition } from '@/lib/view-transitions';
import {
  DISCS,
  LATEST_VERSION,
  getVersion,
  versionOptions,
} from './lib/discs';
import type { DiscMeta } from './lib/discs';
import {
  useReplacementList,
  type DiscReplacement,
} from './lib/state';
import { DiscPicker } from './components/DiscPicker';
import { DiscConfigSheet } from './components/DiscConfigSheet';
import { ReplacementRow } from './components/ReplacementRow';
import { BuildButton } from './components/BuildButton';
import {
  buildVanillaPack,
  downloadBlob,
  type BuildProgress,
} from './lib/pack-builder';

export function VanillaMode() {
  const [versionId, setVersionId] = useState(LATEST_VERSION.id);
  const version = useMemo(() => getVersion(versionId), [versionId]);
  const availableDiscs = useMemo(
    () => DISCS.filter((d) => version.discs.includes(d.id)),
    [version],
  );

  const [packName, setPackName] = useState('My Music Pack');
  const [packDescription, setPackDescription] = useState(
    'Custom music disc replacements — built with mellow llama.',
  );
  const [iconFile, setIconFile] = useState<File | null>(null);

  const replacements = useReplacementList();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [editingDisc, setEditingDisc] = useState<DiscMeta | null>(null);
  const [editingExisting, setEditingExisting] = useState<DiscReplacement | null>(null);

  const [progress, setProgress] = useState<BuildProgress | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);

  // Scoped hotkeys — active only while the Vanilla panel is mounted.
  useHotkey('N', (e) => {
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    e.preventDefault();
    openPicker();
  });
  useHotkey('B', (e) => {
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    if (replacements.items.length === 0) return;
    e.preventDefault();
    void runBuild();
  });

  const openPicker = () => {
    withViewTransition(() => setPickerOpen(true));
  };

  const handleDiscPicked = (disc: DiscMeta) => {
    setEditingExisting(null);
    setEditingDisc(disc);
    withViewTransition(() => {
      setPickerOpen(false);
      setConfigOpen(true);
    });
  };

  const handleConfirm = (item: DiscReplacement) => {
    if (editingExisting) replacements.update(editingExisting.key, item);
    else replacements.add(item);
    setConfigOpen(false);
    setEditingDisc(null);
    setEditingExisting(null);
  };

  const handleEdit = (item: DiscReplacement) => {
    setEditingDisc(item.disc);
    setEditingExisting(item);
    setConfigOpen(true);
  };

  const runBuild = async () => {
    setBuildError(null);
    setProgress({ step: 'decoding', current: 0, total: replacements.items.length, message: 'Starting' });
    try {
      const blob = await buildVanillaPack(
        {
          version,
          replacements: replacements.items,
          metadata: { name: packName, description: packDescription, iconFile },
        },
        setProgress,
      );
      const safeName = packName.replace(/[^a-z0-9_\- ]+/gi, '').trim() || 'music-pack';
      downloadBlob(blob, `${safeName}.zip`);
      window.setTimeout(() => setProgress(null), 1500);
    } catch (err) {
      setBuildError(err instanceof Error ? err.message : String(err));
      setProgress(null);
    }
  };

  const disabledIds = useMemo(
    () => new Set(replacements.items.map((r) => r.disc.id)),
    [replacements.items],
  );

  return (
    <div ref={rootRef} className="space-y-8">
      <section aria-labelledby="replacements-heading" className="space-y-3">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 id="replacements-heading" className="text-[15px] font-semibold">
              Replacements
            </h2>
            <p className="text-[12.5px] text-[var(--color-fg-muted)] mt-0.5">
              Add discs one at a time. Each replacement is independently configurable.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] text-[var(--color-fg-subtle)] uppercase tracking-[0.04em]">
                MC Version
              </span>
              <Select
                value={versionId}
                onChange={(e) => setVersionId(e.target.value)}
                options={versionOptions}
                className="w-[140px]"
              />
            </div>
            <Button
              variant="secondary"
              leading={<Plus size={14} />}
              trailing={<Kbd keys="n" />}
              onClick={openPicker}
            >
              Replace a disc
            </Button>
          </div>
        </div>

        {replacements.items.length === 0 ? (
          <EmptyState onAdd={openPicker} availableCount={availableDiscs.length} />
        ) : (
          <ul className="space-y-1.5">
            <AnimatePresence initial={false}>
              {replacements.items.map((item, i) => (
                <ReplacementRow
                  key={item.key}
                  index={i}
                  item={item}
                  selected={selectedKey === item.key}
                  onSelect={() => setSelectedKey(item.key)}
                  onEdit={() => handleEdit(item)}
                  onRemove={() => replacements.remove(item.key)}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>

      <section aria-labelledby="meta-heading" className="space-y-3">
        <h2 id="meta-heading" className="text-[15px] font-semibold">
          Pack details
        </h2>
        <Card className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Pack name">
            <Input value={packName} onChange={(e) => setPackName(e.target.value)} />
          </Field>
          <Field label="Pack icon (optional)" hint="64×64 png">
            <FileDrop
              compact
              accept="image/png"
              onFiles={(f) => setIconFile(f[0] ?? null)}
              label={iconFile ? iconFile.name : 'Drop a 64×64 PNG'}
            />
          </Field>
          <Field label="Description" hint="shown in Minecraft's pack menu">
            <Textarea
              value={packDescription}
              onChange={(e) => setPackDescription(e.target.value)}
              rows={3}
            />
          </Field>
          <div className="flex flex-col justify-end text-[11.5px] text-[var(--color-fg-subtle)] space-y-1">
            <div>
              Targeting <span className="text-[var(--color-fg-muted)]">{version.id}</span>{' '}
              (<code className="font-mono">pack_format {version.packFormat}</code>).
            </div>
            <div>
              {availableDiscs.length} discs available, {replacements.items.length}{' '}
              queued.
            </div>
          </div>
        </Card>
      </section>

      <section className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--color-border)]">
        <div className="text-[11.5px] text-[var(--color-fg-subtle)]">
          {buildError ? (
            <span className="text-[oklch(0.82_0.15_25)]">Error: {buildError}</span>
          ) : (
            'Everything is processed in your browser. Your files never leave this page.'
          )}
        </div>
        <BuildButton
          onClick={runBuild}
          disabled={replacements.items.length === 0}
          progress={progress}
        />
      </section>

      <DiscPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        discs={availableDiscs}
        disabledIds={disabledIds}
        onPick={handleDiscPicked}
      />
      <DiscConfigSheet
        open={configOpen}
        onClose={() => {
          setConfigOpen(false);
          setEditingDisc(null);
          setEditingExisting(null);
        }}
        disc={editingDisc}
        existing={editingExisting}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

function EmptyState({
  onAdd,
  availableCount,
}: {
  onAdd: () => void;
  availableCount: number;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-10 text-center">
      <div className="mx-auto max-w-[360px] space-y-3">
        <div className="text-[13.5px] text-[var(--color-fg)]">
          Nothing queued yet.
        </div>
        <p className="text-[12.5px] text-[var(--color-fg-muted)]">
          Pick one of the {availableCount} discs available in this Minecraft version,
          attach an audio file, and configure how it should be processed.
        </p>
        <div className="flex items-center justify-center gap-2 pt-1">
          <Button variant="primary" leading={<Plus size={14} />} onClick={onAdd}>
            Replace a disc
          </Button>
          <Kbd keys="n" />
        </div>
      </div>
    </div>
  );
}
