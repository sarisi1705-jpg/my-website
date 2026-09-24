import { CategoryIcon } from "@/lib/icons";

/** Product photo when there is one, otherwise the coloured category icon tile. */
export function ProductMark({ iconKey, color, brandName, imageUrl, alt, large = false }: {
  iconKey: string;
  color: string;
  brandName: string;
  imageUrl?: string | null;
  alt: string;
  large?: boolean;
}) {
  const className = `product-mark${large ? " product-mark--large" : ""}`;
  if (imageUrl) {
    return <div className={`${className} product-mark--image`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- R2 images are served as-is by /api/images */}
      <img src={imageUrl} alt={alt} loading={large ? "eager" : "lazy"} decoding="async" />
    </div>;
  }
  return <div className={className} style={{ "--product-color": color } as React.CSSProperties} role="img" aria-label={alt}>
    <span className="product-orbit" /><CategoryIcon iconKey={iconKey} aria-hidden="true" strokeWidth={1.55} /><span className="product-code">{brandName.slice(0, 2).toUpperCase()}</span>
  </div>;
}
