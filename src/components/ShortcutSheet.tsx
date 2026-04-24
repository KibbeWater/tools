import { Sheet } from '@/components/ui/Sheet';
import { Kbd } from '@/components/ui/Kbd';

interface ShortcutSheetProps {
  open: boolean;
  onClose: () => void;
}

const globals: { keys: string; description: string }[] = [
  { keys: 'Mod+K', description: 'Open command palette' },
  { keys: 'g h', description: 'Go to Home' },
  { keys: 'g m', description: 'Go to Minecraft tool' },
  { keys: '/', description: 'Focus search on current page' },
  { keys: '?', description: 'Show this cheatsheet' },
  { keys: 'Escape', description: 'Close active sheet' },
];

const mcTool: { keys: string; description: string }[] = [
  { keys: 'n', description: 'Replace a disc' },
  { keys: 'b', description: 'Build pack' },
  { keys: 'Tab', description: 'Switch Vanilla / Advanced' },
];

export function ShortcutSheet({ open, onClose }: ShortcutSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Keyboard shortcuts"
      description="Browse and run anything without leaving the keyboard."
      widthClass="w-[min(460px,100vw)]"
    >
      <section className="space-y-7">
        <Group title="Global" items={globals} />
        <Group title="Minecraft resource pack" items={mcTool} />
      </section>
    </Sheet>
  );
}

function Group({
  title,
  items,
}: {
  title: string;
  items: { keys: string; description: string }[];
}) {
  return (
    <div>
      <h3 className="text-[10.5px] uppercase tracking-[0.1em] font-semibold font-mono text-[var(--color-accent-amber)] mb-3">
        // {title}
      </h3>
      <ul className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-raised)]/40 overflow-hidden">
        {items.map((s, i) => (
          <li
            key={s.keys}
            className={`flex items-center justify-between px-3.5 py-2.5 ${
              i !== items.length - 1 ? 'border-b border-[var(--color-border)]' : ''
            }`}
          >
            <span className="text-[13px] text-[var(--color-fg)]">{s.description}</span>
            <Kbd keys={s.keys} />
          </li>
        ))}
      </ul>
    </div>
  );
}
