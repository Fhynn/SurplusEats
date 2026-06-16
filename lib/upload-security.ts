export const imageUploadTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const documentUploadTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const extensionByMimeType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

const allowedExtensionsByMimeType: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
  "application/pdf": ["pdf"],
};

type UploadValidationOptions = {
  allowedMimeTypes: Set<string>;
  maxSizeBytes: number;
  maxSizeMessage: string;
  unsupportedMessage: string;
};

type UploadValidationResult =
  | {
      ok: true;
      contentType: string;
      extension: string;
    }
  | {
      ok: false;
      message: string;
    };

function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase().trim();

  return extension && extension !== fileName.toLowerCase() ? extension : "";
}

function startsWithBytes(bytes: Uint8Array, signature: number[]) {
  if (bytes.length < signature.length) {
    return false;
  }

  return signature.every((value, index) => bytes[index] === value);
}

function readAscii(bytes: Uint8Array, start: number, end: number) {
  return Array.from(bytes.slice(start, end))
    .map((byte) => String.fromCharCode(byte))
    .join("");
}

async function detectContentType(file: File) {
  const buffer = await file.slice(0, 16).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (startsWithBytes(bytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }

  if (startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }

  if (
    readAscii(bytes, 0, 4) === "RIFF" &&
    bytes.length >= 12 &&
    readAscii(bytes, 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  if (readAscii(bytes, 0, 6) === "GIF87a" || readAscii(bytes, 0, 6) === "GIF89a") {
    return "image/gif";
  }

  if (readAscii(bytes, 0, 5) === "%PDF-") {
    return "application/pdf";
  }

  return null;
}

export function getSafeUploadExtension(contentType: string) {
  return extensionByMimeType[contentType] || "bin";
}

export async function validateUploadFile(
  file: File,
  options: UploadValidationOptions,
): Promise<UploadValidationResult> {
  if (file.size <= 0) {
    return { ok: false, message: "File upload tidak boleh kosong." };
  }

  if (file.size > options.maxSizeBytes) {
    return { ok: false, message: options.maxSizeMessage };
  }

  const declaredType = file.type.toLowerCase().trim();

  if (!options.allowedMimeTypes.has(declaredType)) {
    return { ok: false, message: options.unsupportedMessage };
  }

  const detectedType = await detectContentType(file);

  if (!detectedType || !options.allowedMimeTypes.has(detectedType)) {
    return {
      ok: false,
      message: "Isi file tidak sesuai format yang didukung.",
    };
  }

  if (detectedType !== declaredType) {
    return {
      ok: false,
      message: "Format file tidak sesuai dengan isi file.",
    };
  }

  const extension = getFileExtension(file.name);
  const allowedExtensions = allowedExtensionsByMimeType[detectedType] || [];

  if (!extension || !allowedExtensions.includes(extension)) {
    return {
      ok: false,
      message: `Ekstensi file harus ${allowedExtensions
        .map((item) => `.${item}`)
        .join(" atau ")}.`,
    };
  }

  return {
    ok: true,
    contentType: detectedType,
    extension: getSafeUploadExtension(detectedType),
  };
}
