import { createElement } from "react";
import { Box, CircleGauge, Cpu, Droplets, FileText, Monitor, Package, Printer, ScanLine, Wrench, type LucideIcon, type LucideProps } from "lucide-react";
import type { IconKey } from "@/lib/catalog-constants";

// A fixed map (not dynamic imports) keeps the bundle small and lets server
// components pass a plain string to client components.
const icons: Record<IconKey, LucideIcon> = {
  printer: Printer,
  droplets: Droplets,
  gauge: CircleGauge,
  box: Box,
  wrench: Wrench,
  monitor: Monitor,
  scan: ScanLine,
  package: Package,
  cpu: Cpu,
  file: FileText,
};

export function iconFor(key: string | null | undefined): LucideIcon {
  return (key && icons[key as IconKey]) || Package;
}

/** Renders the icon for a category's icon key (falls back to a package icon). */
export function CategoryIcon({ iconKey, ...props }: { iconKey: string | null | undefined } & LucideProps) {
  return createElement(iconFor(iconKey), props);
}
