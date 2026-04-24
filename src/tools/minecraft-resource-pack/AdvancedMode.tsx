import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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
import { BuildButton } from './components/BuildButton';
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
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-[15px] font-semibold">Custom discs</h2>
            <p className="text-[12.5px] text-[var(--color-fg-muted)] mt-0.5">
              Define your own discs. On 1.20.5+ we'll emit a combined resource pack +
              datapack zip that registers them as native jukebox songs.
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
            <Button variant="secondary" leading={<Plus size={14} />} onClick={addDraft}>
              Add custom disc
            </Button>
          </div>
        </div>

        {drafts.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-10 text-center space-y-3">
            <div className="text-[13.5px] text-[var(--color-fg)]">
              No custom discs yet.
            </div>
            <p className="text-[12.5px] text-[var(--color-fg-muted)]">
              Advanced mode registers net-new discs rather than replacing vanilla ones.
              Each disc needs a namespace, a machine-readable id, and an audio file.
            </p>
            <div className="flex justify-center pt-1">
              <Button variant="primary" leading={<Plus size={14} />} onClick={addDraft}>
                Add custom disc
              </Button>
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {drafts.map((d) => (
                <motion.li
                  layout
                  key={d.key}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                >
                  <Card className="p-4 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Display name">
                          <Input
                            value={d.displayName}
                            onChange={(e) =>
                              updateDraft(d.key, { displayName: e.target.value })
                            }
                          />
                        </Field>
                        <Field label="Namespace : id" hint="lowercase, underscores">
                          <div className="flex items-center gap-1.5">
                            <Input
                              value={d.namespace}
                              onChange={(e) =>
                                updateDraft(d.key, { namespace: e.target.value })
                              }
                              placeholder="custom"
                              className="w-[40%]"
                            />
                            <span className="text-[var(--color-fg-subtle)]">:</span>
                            <Input
                              value={d.id}
                              onChange={(e) =>
                                updateDraft(d.key, { id: e.target.value })
                              }
                              placeholder="disc_name"
                              className="flex-1"
                            />
                          </div>
                        </Field>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDraft(d.key)}
                        className="p-2 rounded-[var(--radius-sm)] text-[var(--color-fg-muted)] hover:text-[oklch(0.82_0.15_25)] hover:bg-[var(--color-bg-raised)]"
                        aria-label="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {d.source ? (
                      <div className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-raised)] px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-[12.5px] text-[var(--color-fg)] truncate">
                            {d.source.name}
                          </div>
                          <div className="text-[11px] text-[var(--color-fg-subtle)]">
                            {(d.source.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            updateDraft(d.key, { source: undefined as unknown as File })
                          }
                        >
                          Change
                        </Button>
                      </div>
                    ) : (
                      <FileDrop
                        compact
                        accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a"
                        onFiles={(files) =>
                          files[0] && updateDraft(d.key, { source: files[0] })
                        }
                        label="Drop an audio file"
                      />
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                      <Field label="Gain" hint={`${d.gain.toFixed(1)} dB`}>
                        <Slider
                          min={-18}
                          max={12}
                          step={0.5}
                          value={d.gain}
                          onChange={(e) =>
                            updateDraft(d.key, { gain: Number(e.target.value) })
                          }
                        />
                      </Field>
                      <Field label="OGG quality" hint={`q${d.quality.toFixed(1)}`}>
                        <Slider
                          min={-1}
                          max={10}
                          step={0.5}
                          value={d.quality}
                          onChange={(e) =>
                            updateDraft(d.key, { quality: Number(e.target.value) })
                          }
                        />
                      </Field>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[12.5px] text-[var(--color-fg-muted)]">
                          Mono downmix
                        </span>
                        <Toggle
                          checked={d.mono}
                          onChange={(v) => updateDraft(d.key, { mono: v })}
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

      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold">Pack details</h2>
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
          <Field label="Description">
            <Textarea
              value={packDescription}
              onChange={(e) => setPackDescription(e.target.value)}
              rows={3}
            />
          </Field>
          <div className="flex flex-col justify-end space-y-3">
            <div className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-raised)] px-3 py-2">
              <div>
                <div className="text-[13px] text-[var(--color-fg)]">Emit datapack</div>
                <div className="text-[11.5px] text-[var(--color-fg-subtle)]">
                  Requires 1.20.5+ (pack_format 32). Adds <code>jukebox_song</code>{' '}
                  entries.
                </div>
              </div>
              <Toggle
                checked={emitDatapack && version.packFormat >= 32}
                onChange={setEmitDatapack}
                disabled={version.packFormat < 32}
              />
            </div>
            <div className="text-[11.5px] text-[var(--color-fg-subtle)]">
              Targeting {version.id} (<code className="font-mono">pack_format {version.packFormat}</code>).
              {version.packFormat < 32 && ' Older versions need a helper mod for disc items.'}
            </div>
          </div>
        </Card>
      </section>

      <section className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--color-border)]">
        <div className="text-[11.5px] text-[var(--color-fg-subtle)]">
          {buildError ? (
            <span className="text-[oklch(0.82_0.15_25)]">Error: {buildError}</span>
          ) : (
            'Audio, zip building, and datapack generation all happen locally.'
          )}
        </div>
        <BuildButton onClick={runBuild} disabled={!canBuild} progress={progress} />
      </section>
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
