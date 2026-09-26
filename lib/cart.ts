"use client";

import { useSyncExternalStore } from "react";
import { MAX_CART_LINES, MAX_LINE_QUANTITY } from "@/lib/order-constants";

// The cart lives in the browser as product ids and quantities only. Names and
// prices always come from the server (POST /api/cart), so they are never stale
// or tampered with.

export type StoredCartLine = { productId: number; quantity: number };

const STORAGE_KEY = "ssps-cart";
const CHANGE_EVENT = "ssps-cart-change";
const EMPTY: StoredCartLine[] = [];

let cachedRaw: string | null = null;
let cachedLines: StoredCartLine[] = EMPTY;

function isLine(value: unknown): value is StoredCartLine {
  const line = value as StoredCartLine;
  return Boolean(line) && Number.isInteger(line.productId) && line.productId > 0 && Number.isInteger(line.quantity) && line.quantity > 0;
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // Storage blocked (private mode, settings): behave as an empty cart.
  }
}

function parse(raw: string | null): StoredCartLine[] {
  if (!raw) return EMPTY;
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value)
      ? value.filter(isLine).slice(0, MAX_CART_LINES).map(line => ({ productId: line.productId, quantity: Math.min(line.quantity, MAX_LINE_QUANTITY) }))
      : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** Stable between calls while storage is unchanged, as useSyncExternalStore requires. */
function getSnapshot(): StoredCartLine[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedLines = parse(raw);
  }
  return cachedLines;
}

function getServerSnapshot(): StoredCartLine[] {
  return EMPTY;
}

function subscribe(onChange: () => void): () => void {
  // "storage" fires for changes made in other tabs; CHANGE_EVENT for this one.
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function write(lines: StoredCartLine[]): boolean {
  try {
    if (lines.length) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return true;
}

export function useCart(): StoredCartLine[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useCartCount(): number {
  return useCart().reduce((sum, line) => sum + line.quantity, 0);
}

export type AddResult = "added" | "full" | "unavailable";

/** Adds to an existing line or appends a new one. Quantities are capped at MAX_LINE_QUANTITY. */
export function addToCart(productId: number, quantity = 1): AddResult {
  const lines = getSnapshot();
  const existing = lines.find(line => line.productId === productId);
  if (!existing && lines.length >= MAX_CART_LINES) return "full";
  const next = existing
    ? lines.map(line => (line.productId === productId ? { ...line, quantity: Math.min(line.quantity + quantity, MAX_LINE_QUANTITY) } : line))
    : [...lines, { productId, quantity: Math.min(quantity, MAX_LINE_QUANTITY) }];
  return write(next) ? "added" : "unavailable";
}

export function setCartQuantity(productId: number, quantity: number): void {
  const clamped = Math.max(1, Math.min(Math.trunc(quantity) || 1, MAX_LINE_QUANTITY));
  write(getSnapshot().map(line => (line.productId === productId ? { ...line, quantity: clamped } : line)));
}

export function removeFromCart(productIds: number | number[]): void {
  const remove = new Set(Array.isArray(productIds) ? productIds : [productIds]);
  write(getSnapshot().filter(line => !remove.has(line.productId)));
}

export function clearCart(): void {
  write(EMPTY);
}
