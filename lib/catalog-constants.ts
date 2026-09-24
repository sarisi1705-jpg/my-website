// Plain constants shared by the database schema, validation and UI.

/** Icon names a category can use; lib/icons.ts maps them to Lucide icons. */
export const iconKeys = ["printer", "droplets", "gauge", "box", "wrench", "monitor", "scan", "package", "cpu", "file"] as const;
export const productStatuses = ["draft", "published", "archived"] as const;

export type IconKey = (typeof iconKeys)[number];
export type ProductStatus = (typeof productStatuses)[number];

export const DEFAULT_CURRENCY = "ILS";
