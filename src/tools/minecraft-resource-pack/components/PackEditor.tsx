import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useHotkey } from '@tanstack/react-hotkeys';
import { faArrowUpFromBracket } from '@fortawesome/free-solid-svg-icons/faArrowUpFromBracket';
import { faHandPointer } from '@fortawesome/free-solid-svg-icons/faHandPointer';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FileDrop } from '@/components/ui/FileDrop';
import { Icon } from '@/components/ui/Icon';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Kbd } from '@/components/ui/Kbd';
import { Select } from '@/components/ui/Select';
import { getVersion, supportsCustomDiscs, versionOptions } from '../lib/discs';
import { duplicateCustomIds, trackProblem } from '../lib/project';
import { usePackProject, type DropResult, type DropTarget } from '../hooks/usePackProject';
import { DiscWall } from './DiscWall';
import { TrackPanel } from './TrackPanel';
import { StepHeading } from './StepHeading';
import { BuildBar } from './BuildBar';
import { ProjectMenu } from './ProjectMenu';

const isTyping = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
};

export function PackEditor() {
  const api = usePackProject();
  const { project } = api;
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const bulkRef = useRef<HTMLInputElement>(null);

  const version = getVersion(project?.versionId ?? '');
  const dupes = useMemo(() => duplicateCustomIds(project?.tracks ?? []), [project?.tracks]);
  const selected = project?.tracks.find((t) => t.key === selectedKey) ?? null;
  const blocking = project?.tracks.some(
    (t) => trackProblem(t, version) || (t.kind === 'custom' && dupes.has(`${t.namespace}:${t.id}`)),
  );

  useHotkey('N', (e) => {
    if (isTyping(e)) return;
    e.preventDefault();
    bulkRef.current?.click();
  });

  const handleFiles = async (files: File[], target?: DropTarget) => {
    const r = await api.addFiles(files, target);
    setNotice(describeDrop(r));
    // Open the disc that was just set, so its settings are right there.
    const last = r.added[r.added.length - 1];
    if (last && (target || r.added.length === 1)) setSelectedKey(last.key);
  };

  if (!project) {
    return <div className="py-24 text-center text-[14px] text-[var(--color-fg-subtle)]">Opening your pack…</div>;
  }

  return (
    <div className="space-y-12">
      {api.storageError && (
        <p className="rounded-[16px] border-2 border-[var(--color-danger)] px-4 py-3 text-[14px] text-[var(--color-danger)]">
          {api.storageError}
        </p>
      )}

      <ProjectMenu api={api} onSwitched={() => setSelectedKey(null)} />

      <section aria-labelledby="discs-heading" className="space-y-4">
        <StepHeading
          step={1}
          id="discs-heading"
          title="Fill the discs"
          description={
            <>
              Drop audio files anywhere on the wall. Files named after a disc (like{' '}
              <code className="font-mono text-[13px]">pigstep.mp3</code>) go to that disc; the rest fill empty ones
              {supportsCustomDiscs(version) ? ', then become new discs.' : '.'}
            </>
          }
          actions={
            <>
              <label className="flex items-center gap-2 text-[13px] text-[var(--color-fg-muted)]">
                Minecraft
                <Select
                  value={project.versionId}
                  onChange={(e) => api.updateMeta({ versionId: e.target.value })}
                  options={versionOptions}
                  className="w-[170px]"
                />
              </label>
              <Button
                variant="primary"
                leading={<Icon icon={faArrowUpFromBracket} size={12} />}
                trailing={<Kbd keys="n" className="hidden sm:inline-flex" />}
                onClick={() => bulkRef.current?.click()}
              >
                Add audio
              </Button>
              <input
                ref={bulkRef}
                type="file"
                multiple
                accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a,.aac"
                className="sr-only"
                onChange={(e) => {
                  if (e.target.files?.length) void handleFiles([...e.target.files]);
                  e.target.value = '';
                }}
              />
            </>
          }
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="space-y-3">
            <DiscWall
              version={version}
              tracks={project.tracks}
              selectedKey={selectedKey}
              duplicateIds={dupes}
              onSelect={setSelectedKey}
              onFiles={(files, target) => void handleFiles(files, target)}
            />
            <AnimatePresence>
              {notice && (
                <motion.p
                  key={notice}
                  role="status"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[13.5px] text-[var(--color-fg-muted)]"
                >
                  {notice}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <Card className="p-5 lg:sticky lg:top-20 border-2 border-[var(--color-ink)] shadow-[4px_4px_0_var(--color-ink)]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={selected?.key ?? 'empty'}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.16 }}
              >
                {selected ? (
                  <TrackPanel
                    track={selected}
                    version={version}
                    duplicateId={selected.kind === 'custom' && dupes.has(`${selected.namespace}:${selected.id}`)}
                    onChange={(patch) => api.updateTrack(selected.key, patch)}
                    onReplaceFile={(f) =>
                      void handleFiles(
                        [f],
                        selected.kind === 'vanilla'
                          ? { kind: 'vanilla', discId: selected.discId }
                          : { kind: 'custom', trackKey: selected.key },
                      )
                    }
                    onRemove={() => {
                      api.removeTrack(selected.key);
                      setSelectedKey(null);
                    }}
                  />
                ) : (
                  <div className="py-8 text-center">
                    <Icon icon={faHandPointer} size={26} className="text-[var(--color-fg-subtle)]" />
                    <p className="mt-3 font-display text-[18px] font-semibold">Pick a disc</p>
                    <p className="mt-1 text-[13.5px] text-[var(--color-fg-muted)]">
                      {project.tracks.length
                        ? 'Click a filled disc to preview it and tweak volume, trim and fades.'
                        : 'Once a disc has audio, click it to preview and fine-tune it here.'}
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </Card>
        </div>
      </section>

      <section aria-labelledby="meta-heading" className="space-y-4">
        <StepHeading step={2} id="meta-heading" title="Name the pack" description="This is what shows up in Minecraft's pack menu." />
        <Card className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Pack name">
            <Input value={project.name} onChange={(e) => api.updateMeta({ name: e.target.value })} />
          </Field>
          <Field label="Pack icon" hint="optional, square PNG">
            <FileDrop
              compact
              accept="image/png"
              onFiles={(f) => void api.setIcon(f[0] ?? null)}
              label={project.iconId ? 'Icon added. Choose another' : 'Choose an image'}
            />
          </Field>
          <Field label="Description">
            <Textarea value={project.description} onChange={(e) => api.updateMeta({ description: e.target.value })} rows={2} />
          </Field>
          <p className="self-end text-[13px] text-[var(--color-fg-muted)]">
            {project.tracks.length} {project.tracks.length === 1 ? 'disc' : 'discs'} for Minecraft {version.id}. Saved in
            this browser as you go.
          </p>
        </Card>
      </section>

      <BuildBar project={project} disabled={!project.tracks.length || !!blocking} />
    </div>
  );
}

function describeDrop(r: DropResult): string {
  const parts: string[] = [];
  if (r.added.length) parts.push(`Added ${r.added.length} ${r.added.length === 1 ? 'file' : 'files'}.`);
  if (r.skipped.length) {
    parts.push(
      `${r.skipped.length} didn't fit: every disc is taken, and new discs need Minecraft 1.21 or newer.`,
    );
  }
  if (r.ignored.length) {
    parts.push(`Skipped ${r.ignored.map((f) => f.name).join(', ')} (not audio).`);
  }
  return parts.join(' ') || 'Nothing to add.';
}
