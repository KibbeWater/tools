import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus';
import { useHotkey } from '@tanstack/react-hotkeys';
import { Button } from '@/components/ui/Button';
import { Kbd } from '@/components/ui/Kbd';
import { Icon } from '@/components/ui/Icon';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { FileDrop } from '@/components/ui/FileDrop';
import { withViewTransition } from '@/lib/view-transitions';
import {
  DISCS,
  LATEST_VERSION,
  discImage,
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
import { BuildBar } from './components/BuildBar';
import { StepHeading } from './components/StepHeading';
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
    <div ref={rootRef} className="space-y-12">
      <section aria-labelledby="replacements-heading" className="space-y-4">
        <StepHeading
          step={1}
          id="replacements-heading"
          title="Pick discs to replace"
          description="Each disc gets its own audio file and settings."
          actions={
            <>
              <label className="flex items-center gap-2 text-[13px] text-[var(--color-fg-muted)]">
                Minecraft
                <Select
                  value={versionId}
                  onChange={(e) => setVersionId(e.target.value)}
                  options={versionOptions}
                  className="w-[150px]"
                />
              </label>
              {replacements.items.length > 0 && (
                <Button
                  variant="primary"
                  leading={<Icon icon={faPlus} size={12} />}
                  trailing={<Kbd keys="n" className="hidden sm:inline-flex" />}
                  onClick={openPicker}
                >
                  Add disc
                </Button>
              )}
            </>
          }
        />

        {replacements.items.length === 0 ? (
          <EmptyState onAdd={openPicker} discs={availableDiscs} versionId={version.id} />
        ) : (
          <ul className="overflow-hidden rounded-[20px] border-2 border-[var(--color-ink)] bg-[var(--color-bg-raised)]">
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

      <section aria-labelledby="meta-heading" className="space-y-4">
        <StepHeading
          step={2}
          id="meta-heading"
          title="Name the pack"
          description="This is what shows up in Minecraft's resource pack menu."
        />
        <Card className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Pack name">
            <Input value={packName} onChange={(e) => setPackName(e.target.value)} />
          </Field>
          <Field label="Pack icon" hint="optional, 64×64 PNG">
            <FileDrop
              compact
              accept="image/png"
              onFiles={(f) => setIconFile(f[0] ?? null)}
              label={iconFile ? iconFile.name : 'Choose an image'}
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={packDescription}
              onChange={(e) => setPackDescription(e.target.value)}
              rows={3}
            />
          </Field>
          <dl className="self-end text-[13px] grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
            <dt className="text-[var(--color-fg-subtle)]">Version</dt>
            <dd className="text-[var(--color-fg)]">{version.id}</dd>
            <dt className="text-[var(--color-fg-subtle)]">Pack format</dt>
            <dd className="text-[var(--color-fg)] tabular-nums">{version.packFormat}</dd>
            <dt className="text-[var(--color-fg-subtle)]">Discs</dt>
            <dd className="text-[var(--color-fg)] tabular-nums">
              {replacements.items.length} of {availableDiscs.length} replaced
            </dd>
          </dl>
        </Card>
      </section>

      <BuildBar
        note="Audio is converted and zipped in your browser."
        error={buildError}
        onBuild={runBuild}
        disabled={replacements.items.length === 0}
        progress={progress}
      />

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
  discs,
  versionId,
}: {
  onAdd: () => void;
  discs: DiscMeta[];
  versionId: string;
}) {
  return (
    <div className="rounded-[24px] border-2 border-dashed border-[var(--color-border-hi)] bg-[var(--color-bg-raised)] px-5 py-8 sm:px-8">
      <ul aria-label={`${discs.length} discs in ${versionId}`} className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] justify-items-center -mx-1 mb-5">
        {discs.map((d, i) => (
          <motion.li
            key={d.id}
            initial={{ opacity: 0, y: 10, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22, delay: i * 0.025 }}
          >
            <img
              src={discImage(d.id)}
              alt={d.label}
              title={d.label}
              width={48}
              height={48}
              className="pixelated w-11 h-11 transition-transform duration-200 ease-out hover:-translate-y-1.5 hover:rotate-12"
            />
          </motion.li>
        ))}
      </ul>
      <p className="text-[15px] font-medium text-[var(--color-fg)]">No discs replaced yet.</p>
      <p className="mt-1 text-[14px] text-[var(--color-fg-muted)] leading-relaxed max-w-[52ch]">
        Minecraft {versionId} has {discs.length} music discs. Pick one, give it an audio
        file, and repeat for as many as you like.
      </p>
      <div className="flex items-center gap-3 mt-5">
        <Button variant="primary" leading={<Icon icon={faPlus} size={12} />} onClick={onAdd}>
          Pick a disc
        </Button>
        <span className="hidden sm:inline text-[13px] text-[var(--color-fg-subtle)]">
          or press <Kbd keys="n" />
        </span>
      </div>
    </div>
  );
}
