import { useEffect, useState } from "react";
import { X, ZoomIn } from "lucide-react";

interface LightboxProps {
  src: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
}

export function Lightbox({ src, alt = "", className = "", imgClassName = "w-full h-auto" }: LightboxProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Thumbnail — clickeable */}
      <div
        className={`relative group cursor-zoom-in ${className}`}
        onClick={() => setOpen(true)}
      >
        <img src={src} alt={alt} className={imgClassName} />
        {/* Overlay hint */}
        <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-colors duration-200 rounded-[inherit] flex items-center justify-center">
          <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
        </div>
      </div>

      {/* Lightbox modal */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-card transition z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Image */}
          <div
            className="relative max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={src}
              alt={alt}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-border/40"
            />
          </div>

          <p className="absolute bottom-4 text-xs font-mono text-muted-foreground">
            ESC o click para cerrar
          </p>
        </div>
      )}
    </>
  );
}
