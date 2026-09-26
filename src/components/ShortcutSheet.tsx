import { Sheet } from '@/components/ui/Sheet';
import { Kbd } from '@/components/ui/Kbd';

interface ShortcutSheetProps {
  open: boolean;
  onClose: () => void;
}

const globals: { keys: string; description: string }[] = [
  { keys: 'Mod+K', description: 'Open command palette' },
  { keys: 'g h', description: 'Go to Home' },
  { keys: 'g m', description: 'Go to Minecraft Resource Pack Builder' },
  { keys: 'g p', description: 'Go to Minecraft Painting Pack Builder' },
  { keys: '/', description: 'Focus search on current page' },
  { keys: '?', description: 'Show this list' },
  { keys: 'Escape', description: 'Close the open panel' },
];

const mcTool: { keys: string; description: string }[] = [
  { keys: 'n', description: 'Add audio files' },
  { keys: 'b', description: 'Build pack' },
];

const paintingTool: { keys: string; description: string }[] = [
  { keys: 'n', description: 'Add images' },
  { keys: 'b', description: 'Build pack' },
];

export function ShortcutSheet({ open, onClose }: ShortcutSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Keyboard shortcuts">
      <div className="space-y-8">
        <Group title="Everywhere" items={globals} />
        <Group title="Minecraft Resource Pack Builder" items={mcTool} />
        <Group title="Minecraft Painting Pack Builder" items={paintingTool} />
      </div>
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
    <section>
      <h3 className="text-[13px] font-semibold text-[var(--color-fg)] mb-2">{title}</h3>
      <ul className="border-t border-[var(--color-border)]">
        {items.map((s) => (
          <li
            key={s.keys}
            className="flex items-center justify-between py-2.5 border-b border-[var(--color-border)]"
          >
            <span className="text-[13.5px] text-[var(--color-fg-muted)]">{s.description}</span>
            <Kbd keys={s.keys} />
          </li>
        ))}
      </ul>
    </section>
  );
}
