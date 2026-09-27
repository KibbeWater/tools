import { useState } from 'react';
import { faCopy } from '@fortawesome/free-solid-svg-icons/faCopy';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import type { VersionedCommand } from '@/lib/minecraft';

/** The `/give` commands for a new disc or painting, one per syntax the pack's versions need. */
export function GiveCommands({ commands }: { commands: VersionedCommand[] }) {
  if (commands.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="text-[13px] font-medium">Get it in game</div>
      {commands.map((c) => (
        <div key={c.command} className="space-y-1">
          {c.versions && <div className="text-[12px] text-[var(--color-fg-muted)]">Minecraft {c.versions}</div>}
          <CopyLine command={c.command} />
        </div>
      ))}
      <p className="text-[12px] text-[var(--color-fg-subtle)]">Needs the datapack installed in the world.</p>
    </div>
  );
}

function CopyLine({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  return (
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
  );
}
