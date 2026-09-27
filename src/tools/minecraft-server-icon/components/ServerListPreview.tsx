import { cn } from '@/lib/cn';

interface ServerListPreviewProps {
  /** URL of the rendered icon, or null for Minecraft's default. */
  iconUrl: string | null;
  name: string;
  motd: string;
}

const DEFAULT_ICON = `${import.meta.env.BASE_URL}images/minecraft/server-icon.png`;

/**
 * One row of the Multiplayer screen at GUI scale 2, where the 64 px icon is
 * shown pixel for pixel. The text is an approximation of Minecraft's font.
 */
export function ServerListPreview({ iconUrl, name, motd }: ServerListPreviewProps) {
  const lines = motd.split('\n').slice(0, 2);
  return (
    <div className="overflow-x-auto rounded-[14px] border-2 border-[var(--color-ink)] bg-[#1b1b1f] p-4 sm:p-6">
      <div
        className="mx-auto flex w-[610px] max-w-none items-stretch gap-1.5 border-2 border-[#808080] bg-black/40 p-0.5 font-mono text-[16px] leading-[18px] text-white"
        style={{ textShadow: '2px 2px 0 #3f3f3f' }}
      >
        <img
          src={iconUrl ?? DEFAULT_ICON}
          alt="Server icon preview"
          width={64}
          height={64}
          className="pixelated h-16 w-16 shrink-0"
        />
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate">{name || 'A Minecraft Server'}</span>
            <span className="flex shrink-0 items-center gap-2 text-[#aaaaaa]">
              3/20
              <PingBars />
            </span>
          </div>
          {lines.map((line, i) => (
            <div key={i} className={cn('truncate text-[#aaaaaa]', i === 0 && 'mt-1')}>
              {line || ' '}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Full signal: five green bars, like a server with low ping. */
function PingBars() {
  return (
    <svg width={20} height={16} viewBox="0 0 10 8" aria-hidden className="pixelated" shapeRendering="crispEdges">
      {[3, 4, 5, 6, 7].map((h, i) => (
        <g key={i}>
          <rect x={i * 2 + 0.5} y={8 - h + 0.5} width={1} height={h} fill="#3f3f3f" />
          <rect x={i * 2} y={8 - h} width={1} height={h} fill="#00ff21" />
        </g>
      ))}
    </svg>
  );
}
