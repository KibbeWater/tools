import { cn } from '@/lib/cn';

interface KbdProps {
  keys: string;
  className?: string;
}

/**
 * Formats a hotkey string like `Mod+K` → `⌘ K` on mac, `Ctrl K` on other platforms.
 * Sequences (space-separated) render as separate chips: `g h` → `G` `H`.
 */
export function Kbd({ keys, className }: KbdProps) {
  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');

  const parts = keys.split(' ').filter(Boolean);

  const renderKey = (k: string) => {
    const combo = k.split('+').filter(Boolean);
    return combo
      .map((c) => {
        switch (c.toLowerCase()) {
          case 'mod':
            return isMac ? '⌘' : 'Ctrl';
          case 'meta':
            return isMac ? '⌘' : 'Win';
          case 'shift':
            return isMac ? '⇧' : 'Shift';
          case 'alt':
          case 'option':
            return isMac ? '⌥' : 'Alt';
          case 'ctrl':
          case 'control':
            return isMac ? '⌃' : 'Ctrl';
          case 'escape':
            return 'Esc';
          case 'backspace':
            return isMac ? '⌫' : 'Bksp';
          case 'enter':
            return isMac ? '↵' : 'Enter';
          case 'arrowup':
            return '↑';
          case 'arrowdown':
            return '↓';
          case 'arrowleft':
            return '←';
          case 'arrowright':
            return '→';
          case ' ':
          case 'space':
            return 'Space';
          default:
            return c.length === 1 ? c.toUpperCase() : c;
        }
      })
      .join(isMac ? '' : '+');
  };

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {parts.map((k, i) => (
        <kbd
          key={`${k}-${i}`}
          className="font-mono text-[10.5px] leading-none text-[var(--color-fg-muted)] h-[20px] min-w-[20px] px-1.5 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-raised)]/80 backdrop-blur-sm inline-flex items-center justify-center shadow-[0_1px_0_oklch(0_0_0_/_0.3)]"
        >
          {renderKey(k)}
        </kbd>
      ))}
    </span>
  );
}
