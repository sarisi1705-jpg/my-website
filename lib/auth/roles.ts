// Staff roles and what each may do. Plain constants: safe for client and server.

export const adminRoles = ["owner", "editor", "sales"] as const;
export type AdminRole = (typeof adminRoles)[number];

export const roleLabels: Record<AdminRole, string> = {
  owner: "المالك",
  editor: "محرر المحتوى",
  sales: "المبيعات",
};

export const capabilities = [
  "dashboard.view",
  "inquiries.view",
  "inquiries.manage",
  "inquiries.export",
  "inquiries.delete",
  "catalog.manage",
  "products.hardDelete",
  "users.manage",
  "audit.view",
  "settings.manage",
] as const;
export type Capability = (typeof capabilities)[number];

const grants: Record<AdminRole, readonly Capability[]> = {
  owner: capabilities,
  editor: ["dashboard.view", "catalog.manage"],
  sales: ["dashboard.view", "inquiries.view", "inquiries.manage", "inquiries.export"],
};

export function can(role: AdminRole, capability: Capability): boolean {
  return grants[role].includes(capability);
}
