import { faBox } from '@fortawesome/free-solid-svg-icons/faBox';
import { faCompactDisc } from '@fortawesome/free-solid-svg-icons/faCompactDisc';
import { faMusic } from '@fortawesome/free-solid-svg-icons/faMusic';
import { faWrench } from '@fortawesome/free-solid-svg-icons/faWrench';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { Icon } from '@/components/ui/Icon';

const map: Record<string, IconDefinition> = {
  'compact-disc': faCompactDisc,
  music: faMusic,
  box: faBox,
  wrench: faWrench,
};

export const toolIconDef = (name: string): IconDefinition => map[name] ?? faBox;

export function ToolIcon({ name, size, className }: { name: string; size?: number; className?: string }) {
  return <Icon icon={toolIconDef(name)} size={size} className={className} />;
}
