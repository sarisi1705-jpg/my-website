"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminApi, ApiError } from "@/lib/admin-api";
import { productImageUrl } from "@/lib/images";

const MAX_DIMENSION = 1600;

/** Shrinks large photos in the browser (to WebP when supported) so uploads stay small. */
async function resizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file; // Unreadable here; let the server decide.
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 400 * 1024) return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const toBlob = (type: string) => new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, 0.85));
  const webp = await toBlob("image/webp");
  return (webp?.type === "image/webp" ? webp : await toBlob("image/jpeg")) ?? file;
}

export function ImageUploader({ value, onChange }: { value: string | null; onChange: (key: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      const blob = await resizeImage(file);
      const form = new FormData();
      form.set("file", blob, file.name);
      const { key } = await adminApi<{ key: string }>("/api/admin/uploads", { form });
      onChange(key);
      toast.success("تم رفع الصورة");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "تعذّر رفع الصورة");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const url = productImageUrl(value);
  return <div className="flex flex-wrap items-center gap-4">
    <div className="admin-image-preview">
      {/* eslint-disable-next-line @next/next/no-img-element -- R2 images are served directly */}
      {url ? <img src={url} alt="صورة المنتج" /> : <ImagePlus className="size-8 text-[#94a3b8]" aria-hidden="true" />}
    </div>
    <div className="grid gap-2">
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="اختيار صورة المنتج" onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
      <Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}>{busy ? <Loader2 className="animate-spin" /> : <ImagePlus />}{url ? "تغيير الصورة" : "رفع صورة"}</Button>
      {url && <Button type="button" variant="ghost" className="text-red-600" disabled={busy} onClick={() => onChange(null)}><X />إزالة الصورة</Button>}
      <small className="text-xs text-[#66758b]">JPG أو PNG أو WebP، حتى 5 ميغابايت. بدون صورة تظهر أيقونة التصنيف.</small>
    </div>
  </div>;
}
