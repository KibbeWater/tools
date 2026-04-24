import { Disc3, Music, Package, Wrench } from 'lucide-react';
import type { LucideProps } from 'lucide-react';

const map: Record<string, React.ComponentType<LucideProps>> = {
  Disc3,
  Music,
  Package,
  Wrench,
};

export function ToolIcon({ name, ...rest }: { name: string } & LucideProps) {
  const Icon = map[name] ?? Package;
  return <Icon {...rest} />;
}
