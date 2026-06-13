const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MIN_DIMENSION = 300; // px — below this OCR has nothing to work with

export type SlipValidationError =
  | "errorFileType"
  | "errorFileSize"
  | "errorResolution";

export async function validateSlipFile(
  file: File,
): Promise<SlipValidationError | null> {
  if (!file.type.startsWith("image/")) return "errorFileType";
  if (file.size > MAX_FILE_SIZE) return "errorFileSize";

  try {
    const bitmap = await createImageBitmap(file);
    const tooSmall = bitmap.width < MIN_DIMENSION || bitmap.height < MIN_DIMENSION;
    bitmap.close();
    if (tooSmall) return "errorResolution";
  } catch {
    return "errorFileType"; // not decodable as an image
  }

  return null;
}
