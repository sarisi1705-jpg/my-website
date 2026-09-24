// Plain constants shared by the database schema, validation and UI.
// Kept free of imports so client components can use them cheaply.

export const inquiryTypes = ["quote", "service", "contact"] as const;
export const inquiryStatuses = ["new", "in_progress", "quoted", "closed", "spam"] as const;
export const contactMethods = ["phone", "whatsapp", "email"] as const;

export type InquiryType = (typeof inquiryTypes)[number];
export type InquiryStatus = (typeof inquiryStatuses)[number];
export type ContactMethod = (typeof contactMethods)[number];
