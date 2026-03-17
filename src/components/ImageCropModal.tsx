import { useRef, useState, useCallback, useEffect } from "react";
import Icon from "@/components/ui/icon";

interface Point { x: number; y: number }
interface CropArea { x: number; y: number; width: number; height: number }

interface Props {
  imageSrc: string;
  onCrop: (blob: Blob) => void;
  onCancel: () => void;
}

export default function ImageCropModal({ imageSrc, onCrop, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<Point>({ x: 0, y: 0 });
  const offsetStart = useRef<Point>({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [cropSize, setCropSize] = useState(240);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setReady(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    const size = Math.min(window.innerWidth - 48, 320);
    setCropSize(size);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d")!;
    const s = cropSize;
    canvas.width = s;
    canvas.height = s;

    ctx.clearRect(0, 0, s, s);

    const scale = zoom * Math.max(s / img.naturalWidth, s / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    const dx = (s - w) / 2 + offset.x;
    const dy = (s - h) / 2 + offset.y;

    ctx.save();
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, dx, dy, w, h);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }, [zoom, offset, cropSize]);

  useEffect(() => {
    if (ready) draw();
  }, [draw, ready]);

  const getPoint = (e: React.MouseEvent | React.TouchEvent): Point => {
    if ("touches" in e) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  };

  const onPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    setDragging(true);
    const p = getPoint(e);
    dragStart.current = p;
    offsetStart.current = offset;
  };

  const onPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging) return;
    const p = getPoint(e);
    const dx = p.x - dragStart.current.x;
    const dy = p.y - dragStart.current.y;
    setOffset({ x: offsetStart.current.x + dx, y: offsetStart.current.y + dy });
  };

  const onPointerUp = () => setDragging(false);

  const handleCrop = () => {
    const canvas = document.createElement("canvas");
    const img = imgRef.current;
    if (!img) return;
    const OUTPUT = 400;
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d")!;
    const s = cropSize;

    const scale = zoom * Math.max(s / img.naturalWidth, s / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    const dx = (s - w) / 2 + offset.x;
    const dy = (s - h) / 2 + offset.y;

    const ratio = OUTPUT / s;

    ctx.save();
    ctx.beginPath();
    ctx.arc(OUTPUT / 2, OUTPUT / 2, OUTPUT / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, dx * ratio, dy * ratio, w * ratio, h * ratio);
    ctx.restore();

    canvas.toBlob((blob) => {
      if (blob) onCrop(blob);
    }, "image/jpeg", 0.9);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-card rounded-3xl p-5 flex flex-col items-center gap-4 mx-4 w-full max-w-sm">
        <div className="flex items-center justify-between w-full">
          <span className="font-semibold text-sm">Обрезать фото</span>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div
          ref={containerRef}
          className="relative rounded-full overflow-hidden cursor-grab active:cursor-grabbing touch-none select-none"
          style={{ width: cropSize, height: cropSize }}
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown}
          onTouchMove={onPointerMove}
          onTouchEnd={onPointerUp}
        >
          <canvas ref={canvasRef} style={{ width: cropSize, height: cropSize }} />
        </div>

        <div className="flex items-center gap-3 w-full">
          <Icon name="ZoomOut" size={16} className="text-muted-foreground shrink-0" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-purple-500"
          />
          <Icon name="ZoomIn" size={16} className="text-muted-foreground shrink-0" />
        </div>

        <div className="flex gap-3 w-full">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-2xl border border-border text-sm font-medium"
          >
            Отмена
          </button>
          <button
            onClick={handleCrop}
            className="flex-1 py-2.5 rounded-2xl gradient-purple-blue text-white text-sm font-medium"
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
}
