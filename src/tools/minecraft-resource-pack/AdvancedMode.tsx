import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { faCompactDisc } from '@fortawesome/free-solid-svg-icons/faCompactDisc';
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus';
import { faTrashCan } from '@fortawesome/free-solid-svg-icons/faTrashCan';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { FileDrop } from '@/components/ui/FileDrop';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Slider } from '@/components/ui/Slider';
import { Toggle } from '@/components/ui/Toggle';
import {
  LATEST_VERSION,
  getVersion,
  versionOptions,
} from './lib/discs';
import { cryptoRandom } from './lib/state';
import { BuildBar } from './components/BuildBar';
import { StepHeading } from './components/StepHeading';
import {
  buildAdvancedPack,
  downloadBlob,
  type AdvancedDisc,
  type BuildProgress,
} from './lib/pack-builder';

interface DraftDisc extends AdvancedDisc {
  key: string;
}

export function AdvancedMode() {
  const [versionId, setVersionId] = useState(LATEST_VERSION.id);
  const version = useMemo(() => getVersion(versionId), [versionId]);

  const [packName, setPackName] = useState('My Custom Disc Pack');
  const [packDescription, setPackDescription] = useState(
    'Custom music discs — built with mellow llama.',
  );
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [emitDatapack, setEmitDatapack] = useState(true);

  const [drafts, setDrafts] = useState<DraftDisc[]>([]);
  const [progress, setProgress] = useState<BuildProgress | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);

  const addDraft = () => {
    setDrafts((prev) => [
      ...prev,
      {
        key: cryptoRandom(),
        namespace: sanitizeNamespace(packName) || 'custom',
        id: `disc_${prev.length + 1}`,
        displayName: `Custom Disc ${prev.length + 1}`,
        source: undefined as unknown as File,
        mono: false,
        gain: 0,
        quality: 5,
      },
    ]);
  };

  const updateDraft = (key: string, patch: Partial<DraftDisc>) =>
    setDrafts((prev) =>
      prev.map((d) => (d.key === key ? { ...d, ...patch } : d)),
    );
  const removeDraft = (key: string) =>
    setDrafts((prev) => prev.filter((d) => d.key !== key));

  const canBuild =
    drafts.length > 0 &&
    drafts.every(
      (d) => d.source && /^[a-z0-9_]+$/.test(d.id) && /^[a-z0-9_]+$/.test(d.namespace),
    );

  const runBuild = async () => {
    setBuildError(null);
    setProgress({
      step: 'decoding',
      current: 0,
      total: drafts.length,
      message: 'Starting',
    });
    try {
      const blob = await buildAdvancedPack(
        {
          version,
          discs: drafts.map(({ key: _key, ...rest }) => rest as AdvancedDisc),
          metadata: { name: packName, description: packDescription, iconFile },
          emitDatapack: emitDatapack && version.packFormat >= 32,
        },
        setProgress,
      );
      const safeName = packName.replace(/[^a-z0-9_\- ]+/gi, '').trim() || 'custom-disc-pack';
      downloadBlob(blob, `${safeName}.zip`);
      window.setTimeout(() => setProgress(null), 1500);
    } catch (err) {
      setBuildError(err instanceof Error ? err.message : String(err));
      setProgress(null);
    }
  };

  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <StepHeading
          step={1}
          title="Define your discs"
          description="New discs are added alongside the vanilla ones. On 1.20.5 and later the zip also contains a datapack that registers each one as a jukebox song."
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
              {drafts.length > 0 && (
                <Button variant="primary" leading={<Icon icon={faPlus} size={12} />} onClick={addDraft}>
                  Add disc
                </Button>
              )}
            </>
          }
        />

        {drafts.length === 0 ? (
          <div className="rounded-[24px] border-2 border-dashed border-[var(--color-border-hi)] bg-[var(--color-bg-raised)] px-5 py-8 sm:px-8">
            <Icon icon={faCompactDisc} size={28} className="text-[var(--color-fg-subtle)] mb-4" />
            <p className="text-[15px] font-medium text-[var(--color-fg)]">No custom discs yet.</p>
            <p className="mt-1 text-[14px] text-[var(--color-fg-muted)] leading-relaxed max-w-[52ch]">
              Each disc needs a namespace, an id made of lowercase letters, digits and
              underscores, and an audio file.
            </p>
            <Button
              variant="primary"
              className="mt-5"
              leading={<Icon icon={faPlus} size={12} />}
              onClick={addDraft}
            >
              Add a disc
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {drafts.map((d) => (
                <motion.li
                  layout
                  key={d.key}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Card className="p-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Display name">
                          <Input
                            value={d.displayName}
                            onChange={(e) => updateDraft(d.key, { displayName: e.target.value })}
                          />
                        </Field>
                        <Field label="Namespace and id" hint="a–z, 0–9, _">
                          <div className="flex items-center gap-1.5">
                            <Input
                              value={d.namespace}
                              onChange={(e) => updateDraft(d.key, { namespace: e.target.value })}
                              placeholder="custom"
                              className="w-[40%] font-mono text-[13px]"
                            />
                            <span className="text-[var(--color-fg-subtle)]">:</span>
                            <Input
                              value={d.id}
                              onChange={(e) => updateDraft(d.key, { id: e.target.value })}
                              placeholder="disc_name"
                              className="flex-1 font-mono text-[13px]"
                            />
                          </div>
                        </Field>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDraft(d.key)}
                        className="mt-6 h-10 w-10 inline-flex items-center justify-center rounded-full text-[var(--color-fg-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-surface)]"
                        aria-label="Remove disc"
                        title="Remove disc"
                      >
                        <Icon icon={faTrashCan} size={13} />
                      </button>
                    </div>

                    {d.source ? (
                      <div className="flex items-center justify-between gap-3 rounded-[12px] bg-[var(--color-surface)] px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-[13.5px] text-[var(--color-fg)] truncate">
                            {d.source.name}
                          </div>
                          <div className="text-[12px] text-[var(--color-fg-subtle)] tabular-nums">
                            {(d.source.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => updateDraft(d.key, { source: undefined as unknown as File })}
                        >
                          Change
                        </Button>
                      </div>
                    ) : (
                      <FileDrop
                        compact
                        accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a"
                        onFiles={(files) => files[0] && updateDraft(d.key, { source: files[0] })}
                        label="Choose an audio file"
                      />
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                      <Field label="Gain" hint={`${d.gain.toFixed(1)} dB`}>
                        <Slider
                          min={-18}
                          max={12}
                          step={0.5}
                          value={d.gain}
                          onChange={(e) => updateDraft(d.key, { gain: Number(e.target.value) })}
                        />
                      </Field>
                      <Field label="OGG quality" hint={`q${d.quality.toFixed(1)}`}>
                        <Slider
                          min={-1}
                          max={10}
                          step={0.5}
                          value={d.quality}
                          onChange={(e) => updateDraft(d.key, { quality: Number(e.target.value) })}
                        />
                      </Field>
                      <div className="flex items-center justify-between gap-3 h-9">
                        <span className="text-[13px] font-medium text-[var(--color-fg)]">
                          Mono downmix
                        </span>
                        <Toggle
                          checked={d.mono}
                          onChange={(v) => updateDraft(d.key, { mono: v })}
                          ariaLabel="Mono downmix"
                        />
                      </div>
                    </div>
                  </Card>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <StepHeading step={2} title="Name the pack" />
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
          <div className="self-end space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[13px] font-medium text-[var(--color-fg)]">Include datapack</div>
                <div className="text-[12.5px] text-[var(--color-fg-subtle)]">
                  Adds <code className="font-mono">jukebox_song</code> entries. Needs 1.20.5+.
                </div>
              </div>
              <Toggle
                checked={emitDatapack && version.packFormat >= 32}
                onChange={setEmitDatapack}
                disabled={version.packFormat < 32}
                ariaLabel="Include datapack"
              />
            </div>
            <p className="text-[12.5px] text-[var(--color-fg-subtle)]">
              Targeting {version.id}, pack format {version.packFormat}.
              {version.packFormat < 32 && ' Older versions need a helper mod to add disc items.'}
            </p>
          </div>
        </Card>
      </section>

      <BuildBar
        note="Audio, zip and datapack are all built in your browser."
        error={buildError}
        onBuild={runBuild}
        disabled={!canBuild}
        progress={progress}
      />
    </div>
  );
}

function sanitizeNamespace(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}
