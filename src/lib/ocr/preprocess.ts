import imageCompression from "browser-image-compression";

// Pure pixel transform — no browser dependency, importable in Node.js tests.
// Boosts contrast per channel independently so white-on-color text (e.g. mymo
// GSB amount on a green header) survives Tesseract's internal grayscale step.
export function applyContrastToPixels(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    data[i]   = Math.max(0, Math.min(255, (data[i]   - 128) * 1.5 + 128));
    data[i+1] = Math.max(0, Math.min(255, (data[i+1] - 128) * 1.5 + 128));
    data[i+2] = Math.max(0, Math.min(255, (data[i+2] - 128) * 1.5 + 128));
  }
}

export async function preprocessSlip(file: File): Promise<Blob> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
  });

  return applyCanvasFilter(compressed);
}

async function applyCanvasFilter(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(bitmap, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  applyContrastToPixels(imageData.data);
  ctx.putImageData(imageData, 0, 0);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))), "image/png");
  });
}
