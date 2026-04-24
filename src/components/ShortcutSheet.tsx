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
  { keys: 't', description: 'Toggle theme' },
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
    <Sheet open={open} onClose={onClose} title="Keyboard shortcuts" widthClass="w-[min(440px,100vw)]">
      <section className="space-y-6">
        <Group title="Global" items={globals} />
        <Group title="Minecraft resource pack" items={mcTool} />
      </section>
    </Sheet>
  );
}

function Group({ title, items }: { title: string; items: { keys: string; description: string }[] }) {
  return (
    <div>
      <h3 className="text-[10.5px] uppercase tracking-[0.08em] font-semibold text-[var(--color-fg-subtle)] mb-2">
        {title}
      </h3>
      <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-sm)] border border-[var(--color-border)]">
        {items.map((s) => (
          <li key={s.keys} className="flex items-center justify-between px-3 py-2">
            <span className="text-[13px] text-[var(--color-fg)]">{s.description}</span>
            <Kbd keys={s.keys} />
          </li>
        ))}
      </ul>
    </div>
  );
}
