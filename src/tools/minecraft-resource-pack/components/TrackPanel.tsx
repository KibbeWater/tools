import { useEffect, useRef, useState } from 'react';
import { faPlay } from '@fortawesome/free-solid-svg-icons/faPlay';
import { faStop } from '@fortawesome/free-solid-svg-icons/faStop';
import { faTrashCan } from '@fortawesome/free-solid-svg-icons/faTrashCan';
import { faArrowUpFromBracket } from '@fortawesome/free-solid-svg-icons/faArrowUpFromBracket';
import { faCopy } from '@fortawesome/free-solid-svg-icons/faCopy';
import { faCompactDisc } from '@fortawesome/free-solid-svg-icons/faCompactDisc';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Field, Input } from '@/components/ui/Input';
import { Slider } from '@/components/ui/Slider';
import { Toggle } from '@/components/ui/Toggle';
import { discImage, getDisc, giveCommand, type McVersion } from '../lib/discs';
import { isValidId, sanitizeId, trackProblem, type AudioSettings, type Track } from '../lib/project';
import { loadBlob } from '@/tools/minecraft-pack/lib/storage';
import { decodeForPreview, play, type Playback } from '../lib/preview';
import { Waveform } from './Waveform';

interface TrackPanelProps {
  track: Track;
  version: McVersion;
  duplicateId: boolean;
  onChange: (patch: Partial<Track>) => void;
  onReplaceFile: (file: File) => void;
  onRemove: () => void;
}

export function TrackPanel({ track, version, duplicateId, onChange, onReplaceFile, onRemove }: TrackPanelProps) {
  const s = track.settings;
  const set = (patch: Partial<AudioSettings>) => onChange({ settings: { ...s, ...patch } });
  const fileRef = useRef<HTMLInputElement>(null);
  const { buffer, failed } = usePreviewBuffer(track.audioId);
  const { playhead, playing, toggle, seek } = usePlayback(buffer, s);
  const disc = track.kind === 'vanilla' ? getDisc(track.discId) : undefined;
  const problem = trackProblem(track, version);
  const clipLen = buffer ? (s.trimEnd > 0 ? Math.min(s.trimEnd, buffer.duration) : buffer.duration) - s.trimStart : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        {disc ? (
          <img src={discImage(disc.id)} alt="" width={56} height={56} className="pixelated w-14 h-14 -my-2 shrink-0" />
        ) : (
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-[var(--color-ink)] bg-[var(--color-accent)]">
            <Icon icon={faCompactDisc} size={20} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[22px] font-semibold leading-tight truncate">
            {disc ? disc.label : track.kind === 'custom' ? track.displayName || 'Untitled disc' : ''}
          </h3>
          <p className="text-[13px] text-[var(--color-fg-muted)] truncate" title={track.fileName}>
            {track.fileName}
            {track.durationSec !== undefined && ` · ${formatTime(track.durationSec)}`}
          </p>
        </div>
      </div>

      {(problem || duplicateId) && (
        <p className="rounded-[12px] border-2 border-[var(--color-danger)] px-3 py-2 text-[13px] text-[var(--color-danger)]">
          {problem ?? 'Another disc already uses this namespace and id.'}
        </p>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={toggle}
            disabled={!buffer}
            leading={<Icon icon={playing ? faStop : faPlay} size={12} />}
          >
            {playing ? 'Stop' : 'Preview'}
          </Button>
          <span className="text-[13px] text-[var(--color-fg-muted)] tabular-nums">
            {clipLen !== null && `Plays ${formatTime(clipLen)}`}
          </span>
        </div>
        {buffer ? (
          <Waveform
            buffer={buffer}
            trimStart={s.trimStart}
            trimEnd={s.trimEnd}
            onTrimChange={(trimStart, trimEnd) => set({ trimStart, trimEnd })}
            playhead={playhead}
            onSeek={seek}
          />
        ) : (
          <div className="grid h-20 place-items-center rounded-[14px] border-2 border-dashed border-[var(--color-border-hi)] text-[13px] text-[var(--color-fg-subtle)]">
            {failed ? "Your browser can't preview this file, but it will still build." : 'Loading waveform…'}
          </div>
        )}
        <p className="text-[12px] text-[var(--color-fg-subtle)]">Drag the handles to trim. Click the waveform to play from there.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start" hint="seconds">
          <Input
            type="number"
            min={0}
            step={0.1}
            value={s.trimStart}
            onChange={(e) => set({ trimStart: Math.max(0, Number(e.target.value) || 0) })}
          />
        </Field>
        <Field label="End" hint="0 = full length">
          <Input
            type="number"
            min={0}
            step={0.1}
            value={s.trimEnd}
            onChange={(e) => set({ trimEnd: Math.max(0, Number(e.target.value) || 0) })}
          />
        </Field>
      </div>

      <Field label="Volume" hint={`${s.gainDb > 0 ? '+' : ''}${s.gainDb.toFixed(1)} dB`}>
        <Slider min={-18} max={12} step={0.5} value={s.gainDb} onChange={(e) => set({ gainDb: Number(e.target.value) })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fade in" hint={`${s.fadeInSec.toFixed(1)} s`}>
          <Slider min={0} max={10} step={0.1} value={s.fadeInSec} onChange={(e) => set({ fadeInSec: Number(e.target.value) })} />
        </Field>
        <Field label="Fade out" hint={`${s.fadeOutSec.toFixed(1)} s`}>
          <Slider min={0} max={10} step={0.1} value={s.fadeOutSec} onChange={(e) => set({ fadeOutSec: Number(e.target.value) })} />
        </Field>
      </div>
      <Field label="Quality" hint={`${s.quality} · ${qualityHint(s.quality)}`}>
        <Slider min={-1} max={10} step={1} value={s.quality} onChange={(e) => set({ quality: Number(e.target.value) })} />
      </Field>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[13px] font-medium">Mono</div>
          <div className="text-[12.5px] text-[var(--color-fg-subtle)]">Roughly halves the file size.</div>
        </div>
        <Toggle checked={s.mono} onChange={(mono) => set({ mono })} ariaLabel="Mono" />
      </div>

      {track.kind === 'custom' && (
        <div className="space-y-3 border-t-2 border-dashed border-[var(--color-border-hi)] pt-5">
          <Field label="Disc name" hint="shown in the tooltip">
            <Input value={track.displayName} onChange={(e) => onChange({ displayName: e.target.value })} />
          </Field>
          <Field label="Namespace and id" hint="a–z, 0–9, _">
            <div className="flex items-center gap-1.5">
              <Input
                value={track.namespace}
                aria-invalid={!isValidId(track.namespace)}
                onChange={(e) => onChange({ namespace: e.target.value })}
                onBlur={() => onChange({ namespace: sanitizeId(track.namespace) || 'custom' })}
                className="min-w-0 flex-[4] font-mono text-[13px]"
              />
              <span className="text-[var(--color-fg-subtle)]">:</span>
              <Input
                value={track.id}
                aria-invalid={!isValidId(track.id)}
                onChange={(e) => onChange({ id: e.target.value })}
                onBlur={() => onChange({ id: sanitizeId(track.id) || 'disc' })}
                className="min-w-0 flex-[5] font-mono text-[13px]"
              />
            </div>
          </Field>
          <GiveCommand command={giveCommand(version, `${track.namespace}:${track.id}`)} />
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t-2 border-dashed border-[var(--color-border-hi)] pt-5">
        <Button leading={<Icon icon={faArrowUpFromBracket} size={12} />} onClick={() => fileRef.current?.click()}>
          Replace audio
        </Button>
        <Button variant="danger" leading={<Icon icon={faTrashCan} size={12} />} onClick={onRemove}>
          Remove
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a,.aac"
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

function usePreviewBuffer(audioId: string) {
  const [state, setState] = useState<{ id: string; buffer: AudioBuffer | null; failed: boolean }>({
    id: audioId,
    buffer: null,
    failed: false,
  });
  useEffect(() => {
    let alive = true;
    setState({ id: audioId, buffer: null, failed: false });
    loadBlob(audioId)
      .then((f) => (f ? decodeForPreview(audioId, f) : Promise.reject(new Error('missing'))))
      .then((buffer) => alive && setState({ id: audioId, buffer, failed: false }))
      .catch(() => alive && setState({ id: audioId, buffer: null, failed: true }));
    return () => {
      alive = false;
    };
  }, [audioId]);
  return state.id === audioId ? state : { buffer: null, failed: false };
}

function usePlayback(buffer: AudioBuffer | null, settings: AudioSettings) {
  const [pb, setPb] = useState<Playback | null>(null);
  const [playhead, setPlayhead] = useState<number | null>(null);

  const start = (fromClipSec = 0) => {
    if (!buffer) return;
    const p = play(buffer, settings, fromClipSec);
    setPb(p);
    void p.ended.then(() => {
      setPb((cur) => (cur === p ? null : cur));
      setPlayhead(null);
    });
  };

  useEffect(() => {
    if (!pb) return;
    let raf = 0;
    const tick = () => {
      setPlayhead(settings.trimStart + pb.position());
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [pb, settings.trimStart]);

  // Stop when the track changes or the panel closes.
  useEffect(() => () => pb?.stop(), [pb, buffer]);

  return {
    playing: pb !== null,
    playhead: pb ? playhead : null,
    toggle: () => (pb ? pb.stop() : start()),
    seek: (sourceSec: number) => start(Math.max(0, sourceSec - settings.trimStart)),
  };
}

function qualityHint(q: number): string {
  if (q <= 1) return 'small file';
  if (q <= 4) return 'balanced';
  if (q <= 7) return 'good';
  return 'best, large file';
}

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
