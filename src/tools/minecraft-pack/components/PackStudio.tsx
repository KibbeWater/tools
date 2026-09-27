import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { FileDrop } from '@/components/ui/FileDrop';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { PackProjectMenu } from '@/components/PackProjectMenu';
import { StepHeading } from '@/components/StepHeading';
import { cn } from '@/lib/cn';
import { VersionWarning } from '@/components/VersionWarning';
import { getRelease, packRange, rangeLabel, releaseOptions } from '@/lib/minecraft';
import { DiscEditor } from '@/tools/minecraft-resource-pack/components/DiscEditor';
import { PaintingEditor } from '@/tools/minecraft-paintings/components/PaintingEditor';
import { usePack } from '../hooks/usePack';
import { packProblems, packWarnings } from '../lib/build';
import { describePack, type Pack } from '../lib/pack';
import { protectionsFor } from '../lib/protection';
import { BuildBar, blockedReason } from './BuildBar';

export type StudioTab = 'discs' | 'paintings';

export const STUDIO_TABS: { id: StudioTab; label: string; count: (p: Pack) => number }[] = [
  { id: 'discs', label: 'Music discs', count: (p) => p.tracks.length },
  { id: 'paintings', label: 'Paintings', count: (p) => p.art.length },
];

interface PackStudioProps {
  tab: StudioTab;
  onTab: (tab: StudioTab) => void;
}

/** One pack, edited feature by feature, built into a single resource pack. */
export function PackStudio({ tab, onTab }: PackStudioProps) {
  const api = usePack();
  const { project: pack } = api;
  const problems = useMemo(() => (pack ? packProblems(pack) : []), [pack]);
  const warnings = useMemo(() => (pack ? packWarnings(pack) : []), [pack]);

  if (!pack) {
    return <div className="py-24 text-center text-[14px] text-[var(--color-fg-subtle)]">Opening your pack…</div>;
  }

  return (
    <div className="space-y-12">
      {api.storageError && (
        <p className="rounded-[16px] border-2 border-[var(--color-danger)] px-4 py-3 text-[14px] text-[var(--color-danger)]">
          {api.storageError}
        </p>
      )}

      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PackProjectMenu api={api} describe={describePack} onSwitched={() => {}} />
          <VersionRangePicker pack={pack} onChange={api.updateMeta} />
        </div>

        <div role="tablist" aria-label="What to edit" className="flex flex-wrap gap-2">
          {STUDIO_TABS.map((t) => {
            const n = t.count(pack);
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                onClick={() => onTab(t.id)}
                className={cn(
                  'inline-flex h-10 items-center gap-2 rounded-full border-2 border-[var(--color-ink)] px-4 text-[14px] font-semibold transition-[background-color,box-shadow]',
                  tab === t.id
                    ? 'bg-[var(--color-accent)] text-[var(--color-accent-fg)] shadow-[3px_3px_0_var(--color-ink)]'
                    : 'bg-[var(--color-bg-raised)] hover:bg-[var(--color-surface)]',
                )}
              >
                {t.label}
                <span
                  className={cn(
                    'min-w-6 rounded-full px-1.5 text-[12px] tabular-nums',
                    n ? 'bg-[var(--color-ink)] text-[var(--color-bg-raised)]' : 'text-[var(--color-fg-subtle)]',
                  )}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'discs' ? (
          <DiscEditor key={pack.id} pack={pack} handle={api.handle} />
        ) : (
          <PaintingEditor key={pack.id} pack={pack} handle={api.handle} />
        )}
      </div>

      <section aria-labelledby="meta-heading" className="space-y-4">
        <StepHeading
          step={2}
          id="meta-heading"
          title="Name the pack"
          description="This is what shows up in Minecraft's pack menu. Discs and paintings all go in this one pack."
        />
        <Card className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Pack name">
            <Input value={pack.name} onChange={(e) => api.updateMeta({ name: e.target.value })} />
          </Field>
          <Field label="Pack icon" hint="optional, square PNG">
            <FileDrop
              compact
              accept="image/png"
              onFiles={(f) => void api.setIcon(f[0] ?? null)}
              label={pack.iconId ? 'Icon added. Choose another' : 'Choose an image'}
            />
          </Field>
          <Field label="Description">
            <Textarea value={pack.description} onChange={(e) => api.updateMeta({ description: e.target.value })} rows={2} />
          </Field>
          <p className="self-end text-[13px] text-[var(--color-fg-muted)]">
            Minecraft {rangeLabel(packRange(pack, getRelease))}: {describePack(pack).toLowerCase()}. Saved in this browser as you go.
          </p>
          <ProtectionSettings pack={pack} onChange={(protect) => api.updateMeta({ protect })} />
        </Card>
      </section>

      {warnings.length > 0 && (
        <VersionWarning>
          <p className="font-medium">
            {warnings.length === 1 ? 'One thing' : `${warnings.length} things`} won't work on every version from{' '}
            {rangeLabel(packRange(pack, getRelease))}. The pack still builds.
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {warnings.map((w) => (
              <li key={w}>{w}.</li>
            ))}
          </ul>
        </VersionWarning>
      )}

      <BuildBar pack={pack} blocked={blockedReason(pack, problems)} />
    </div>
  );
}

/**
 * Oldest and newest Minecraft version the pack targets. Picking one past the
 * other drags the other along, so the range never turns inside out.
 */
function VersionRangePicker({
  pack,
  onChange,
}: {
  pack: Pack;
  onChange: (patch: Pick<Pack, 'versionId' | 'minVersionId'>) => void;
}) {
  const { from, to } = packRange(pack, getRelease);
  const set = (fromId: string, toId: string, moved: 'from' | 'to') => {
    const a = getRelease(fromId);
    const b = getRelease(toId);
    if (a.order <= b.order) onChange({ minVersionId: a.id, versionId: b.id });
    else if (moved === 'from') onChange({ minVersionId: a.id, versionId: a.id });
    else onChange({ minVersionId: b.id, versionId: b.id });
  };
  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px] text-[var(--color-fg-muted)]">
      <label className="flex h-10 items-center gap-2">
        Minecraft
        <Select
          aria-label="Oldest Minecraft version"
          value={from.id}
          onChange={(e) => set(e.target.value, to.id, 'from')}
          options={releaseOptions}
          className="w-[170px]"
        />
      </label>
      <label className="flex h-10 items-center gap-2">
        to
        <Select
          aria-label="Newest Minecraft version"
          value={to.id}
          onChange={(e) => set(from.id, e.target.value, 'to')}
          options={releaseOptions}
          className="w-[170px]"
        />
      </label>
    </div>
  );
}

function ProtectionSettings({ pack, onChange }: { pack: Pack; onChange: (protect: boolean) => void }) {
  const on = !!pack.protect;
  const range = packRange(pack, getRelease);
  const plan = protectionsFor(range);
  return (
    <div className="md:col-span-2 space-y-3 border-t-2 border-dashed border-[var(--color-border-hi)] pt-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium" id="protect-label">
            Protect pack
          </p>
          <p className="mt-0.5 max-w-[60ch] text-[13px] text-[var(--color-fg-muted)]">
            Makes the downloaded pack harder to pick apart and reuse. It plays exactly the same in
            game, and your copy here stays fully editable.
          </p>
        </div>
        <Toggle checked={on} onChange={onChange} ariaLabel="Protect pack" />
      </div>
      {on && (
        <div className="grid gap-3 text-[13px] md:grid-cols-2">
          <div>
            <p className="font-medium">For Minecraft {rangeLabel(range)}, this:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[var(--color-fg-muted)]">
              {plan.applied.map((p) => (
                <li key={p.id}>{p.label}.</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium">Good to know</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[var(--color-fg-muted)]">
              {plan.limits.map((l) => (
                <li key={l}>{l}</li>
              ))}
              <li>
                It slows down casual copying but can't stop someone determined: the game has to be
                able to read everything.
              </li>
              <li>Opening a protected zip here later brings back the discs and paintings, but not their original file names; new paintings also come back renamed.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
