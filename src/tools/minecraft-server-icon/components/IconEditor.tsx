import { useRef, useState } from 'react';
import { useHotkey } from '@tanstack/react-hotkeys';
import { faArrowUpFromBracket } from '@fortawesome/free-solid-svg-icons/faArrowUpFromBracket';
import { faCopy } from '@fortawesome/free-solid-svg-icons/faCopy';
import { faDownload } from '@fortawesome/free-solid-svg-icons/faDownload';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FileDrop } from '@/components/ui/FileDrop';
import { Icon } from '@/components/ui/Icon';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Kbd } from '@/components/ui/Kbd';
import { Segmented } from '@/components/ui/Segmented';
import { Slider } from '@/components/ui/Slider';
import { StepHeading } from '@/components/StepHeading';
import { downloadBlob } from '@/lib/minecraft';
import { dataUri, formatBytes, ICON_SIZE, IMAGE_ACCEPT, MAX_ZOOM } from '../lib/icon';
import { useServerIcon } from '../hooks/useServerIcon';
import { CropEditor } from './CropEditor';
import { ServerListPreview } from './ServerListPreview';

const FILE_NAME = 'server-icon.png';

const isTyping = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
};

export function IconEditor() {
  const { image, settings: s, update, open, loading, error, icon } = useServerIcon();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('A Minecraft Server');
  const [motd, setMotd] = useState('Welcome! Grab a pickaxe.');
  const [copied, setCopied] = useState(false);

  const download = () => {
    if (icon) downloadBlob(new Blob([icon.png as BlobPart], { type: 'image/png' }), FILE_NAME);
  };

  useHotkey('N', (e) => {
    if (isTyping(e)) return;
    e.preventDefault();
    fileRef.current?.click();
  });
  useHotkey('D', (e) => {
    if (isTyping(e) || !icon) return;
    e.preventDefault();
    download();
  });

  const onFiles = (files: File[]) => {
    const f = files[0];
    if (f) void open(f);
  };

  return (
    <div className="space-y-12">
      <section aria-labelledby="image-heading" className="space-y-4">
        <StepHeading
          step={1}
          id="image-heading"
          title="Pick an image"
          description="Any picture works: photos, logos, pixel art, even SVGs. It's cut to a square and shrunk to 64×64, the only size Minecraft shows."
          actions={
            <>
              <Button
                variant="primary"
                leading={<Icon icon={faArrowUpFromBracket} size={12} />}
                trailing={<Kbd keys="n" className="hidden sm:inline-flex" />}
                onClick={() => fileRef.current?.click()}
              >
                {image ? 'Replace image' : 'Choose image'}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept={IMAGE_ACCEPT}
                className="sr-only"
                onChange={(e) => {
                  onFiles([...(e.target.files ?? [])]);
                  e.target.value = '';
                }}
              />
            </>
          }
        />

        {error && (
          <p className="rounded-[16px] border-2 border-[var(--color-danger)] px-4 py-3 text-[14px] text-[var(--color-danger)]">
            {error}
          </p>
        )}

        {!image ? (
          <FileDrop
            accept={IMAGE_ACCEPT}
            onFiles={onFiles}
            label={loading ? 'Opening…' : 'Drop an image or click to browse'}
            sublabel="PNG, JPEG, WebP, GIF, BMP, ICO, SVG, or anything else your browser can open. Nothing is uploaded."
            className="py-16"
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <Card className="space-y-5 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium" title={image.fileName}>
                    {image.fileName}
                  </div>
                  <div className="text-[12px] text-[var(--color-fg-subtle)] tabular-nums">
                    {image.width}×{image.height} px{image.converted ? ' · converted by your browser' : ''}
                  </div>
                </div>
                <Segmented
                  value={s.fit}
                  onChange={(fit) => update({ fit })}
                  options={[
                    { value: 'crop', label: 'Crop' },
                    { value: 'fit', label: 'Fit' },
                    { value: 'stretch', label: 'Stretch' },
                  ]}
                />
              </div>

              <FileDrop
                accept={IMAGE_ACCEPT}
                onFiles={onFiles}
                compact
                label={loading ? 'Opening…' : 'Drop another image here to swap it'}
              />

              {s.fit === 'crop' ? (
                <>
                  <CropEditor image={image} settings={s} onChange={update} />
                  <p className="text-[12px] text-[var(--color-fg-subtle)]">
                    Drag the square to choose what shows. Scroll or use the slider to zoom; double-click to reset.
                  </p>
                  <Field label="Zoom" hint={`${s.zoom.toFixed(1)}×`}>
                    <Slider min={1} max={MAX_ZOOM} step={0.05} value={s.zoom} onChange={(e) => update({ zoom: Number(e.target.value) })} />
                  </Field>
                </>
              ) : (
                <p className="text-[12px] text-[var(--color-fg-subtle)]">
                  {s.fit === 'fit'
                    ? 'The whole image is shrunk to fit, and the leftover space is filled with the background.'
                    : 'The whole image is squeezed into a square, so it may look squashed.'}
                </p>
              )}

              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[13px] font-medium">Scaling</div>
                  <div className="text-[12.5px] text-[var(--color-fg-subtle)]">
                    {s.filter === 'smooth' ? 'Best for photos and logos.' : 'Keeps hard pixel edges for pixel art.'}
                  </div>
                </div>
                <Segmented
                  value={s.filter}
                  onChange={(filter) => update({ filter })}
                  options={[
                    { value: 'smooth', label: 'Smooth' },
                    { value: 'sharp', label: 'Sharp' },
                  ]}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[13px] font-medium">Background</div>
                  <div className="text-[12.5px] text-[var(--color-fg-subtle)]">Shows through transparent parts.</div>
                </div>
                <div className="flex items-center gap-2">
                  {s.background && (
                    <input
                      type="color"
                      aria-label="Background color"
                      value={s.background}
                      onChange={(e) => update({ background: e.target.value })}
                      className="h-8 w-8 cursor-pointer overflow-hidden rounded-full border-2 border-[var(--color-ink)] bg-transparent p-0 [&::-moz-color-swatch]:border-none [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:p-0"
                    />
                  )}
                  <Segmented
                    value={s.background ? 'color' : 'none'}
                    onChange={(v) => update({ background: v === 'color' ? '#ffffff' : null })}
                    options={[
                      { value: 'none', label: 'None' },
                      { value: 'color', label: 'Color' },
                    ]}
                  />
                </div>
              </div>
            </Card>

            <Card className="space-y-3 p-5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] font-medium">Your icon</span>
                <span className="text-[12px] text-[var(--color-fg-subtle)] tabular-nums">
                  {ICON_SIZE}×{ICON_SIZE} px{icon ? ` · ${formatBytes(icon.png.length)}` : ''}
                </span>
              </div>
              <div className="checker mx-auto aspect-square w-full max-w-[256px] overflow-hidden rounded-[6px] outline outline-2 outline-[var(--color-ink)]">
                {icon && <img src={icon.url} alt="Rendered server icon" className="pixelated block h-full w-full" />}
              </div>
              <div className="flex items-end justify-center gap-4 pt-1">
                {[16, 32, 64].map((px) => (
                  <div key={px} className="flex flex-col items-center gap-1">
                    <div className="checker overflow-hidden outline outline-1 outline-[var(--color-border-hi)]" style={{ width: px, height: px }}>
                      {icon && <img src={icon.url} alt="" className="block h-full w-full" />}
                    </div>
                    <span className="text-[11px] text-[var(--color-fg-subtle)] tabular-nums">{px}px</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </section>

      <section aria-labelledby="preview-heading" className="space-y-4">
        <StepHeading
          step={2}
          id="preview-heading"
          title="See it in the server list"
          description="How your server shows up on the Multiplayer screen. The name and message here are just for the preview; set the real message with motd in server.properties."
        />
        <ServerListPreview iconUrl={icon?.url ?? null} name={name} motd={motd} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Server name" hint="preview only">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Message of the day" hint="two lines">
            <Textarea rows={2} value={motd} onChange={(e) => setMotd(e.target.value)} />
          </Field>
        </div>
      </section>

      <section aria-labelledby="install-heading" className="space-y-4">
        <StepHeading
          step={3}
          id="install-heading"
          title="Put it on your server"
          actions={
            <>
              <Button
                disabled={!icon}
                leading={<Icon icon={faCopy} size={12} />}
                onClick={() => {
                  if (!icon) return;
                  void navigator.clipboard?.writeText(dataUri(icon.png)).then(() => {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                  });
                }}
              >
                {copied ? 'Copied' : 'Copy as base64'}
              </Button>
              <Button
                variant="accent"
                size="lg"
                disabled={!icon}
                leading={<Icon icon={faDownload} size={13} />}
                trailing={<Kbd keys="d" className="hidden sm:inline-flex" />}
                onClick={download}
              >
                Download {FILE_NAME}
              </Button>
            </>
          }
        />
        <ol className="list-decimal space-y-1.5 pl-5 text-[14px] leading-relaxed text-[var(--color-fg-muted)] sm:ml-11">
          <li>
            Put <code className="font-mono text-[13px]">{FILE_NAME}</code> in your server's main folder, next to{' '}
            <code className="font-mono text-[13px]">server.properties</code>. Keep the name exactly as it is.
          </li>
          <li>Restart the server. It only reads the icon when it starts.</li>
          <li>Refresh the Multiplayer screen in Minecraft to see it.</li>
        </ol>
        <p className="text-[12.5px] text-[var(--color-fg-subtle)] sm:ml-11 max-w-[70ch]">
          Works with vanilla, Paper, Spigot, Fabric and Forge servers. Behind a proxy like Velocity or BungeeCord, put it
          in the proxy's folder instead. The base64 copy is the <code className="font-mono">favicon</code> value from a
          server status response, for plugins and hosts that ask for one.
        </p>
      </section>
    </div>
  );
}
