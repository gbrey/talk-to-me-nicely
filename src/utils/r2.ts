/**
 * Helpers para Cloudflare R2
 */

export interface R2Bucket {
  get(key: string): Promise<R2Object | null>;
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null | Blob,
    options?: R2PutOptions
  ): Promise<R2Object>;
  delete(keys: string[]): Promise<void>;
  head(key: string): Promise<R2Object | null>;
}

export interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: Date;
  checksums: R2Checksums;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

export interface R2PutOptions {
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
  onlyIf?: R2Conditional;
}

export interface R2HTTPMetadata {
  contentType?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
  cacheExpiry?: Date;
}

export interface R2Checksums {
  md5?: ArrayBuffer;
  sha1?: ArrayBuffer;
  sha256?: ArrayBuffer;
  sha384?: ArrayBuffer;
  sha512?: ArrayBuffer;
}

export interface R2Conditional {
  etagMatches?: string;
  etagDoesNotMatch?: string;
  uploadedBefore?: Date;
  uploadedAfter?: Date;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'];

/**
 * Valida un archivo antes de subirlo
 */
export function validateFile(
  filename: string,
  size: number
): { valid: boolean; error?: string } {
  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `El archivo excede el tamaño máximo de ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  const extension = filename.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Tipo de archivo no permitido. Extensiones permitidas: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Genera una key única para un archivo
 */
export function generateFileKey(
  familyId: string,
  messageId: string,
  filename: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = filename.split('.').pop()?.toLowerCase() || 'bin';
  return `families/${familyId}/messages/${messageId}/${timestamp}-${random}.${extension}`;
}

/**
 * Sube un archivo a R2
 */
export async function uploadFile(
  bucket: R2Bucket,
  key: string,
  file: ArrayBuffer | Blob | ReadableStream,
  contentType?: string
): Promise<R2Object> {
  const options: R2PutOptions = {
    httpMetadata: {
      contentType: contentType || 'application/octet-stream',
    },
  };

  return await bucket.put(key, file, options);
}

/**
 * Obtiene un archivo de R2
 */
export async function getFile(
  bucket: R2Bucket,
  key: string
): Promise<R2Object | null> {
  return await bucket.get(key);
}

/**
 * Elimina un archivo de R2
 */
export async function deleteFile(bucket: R2Bucket, key: string): Promise<void> {
  await bucket.delete([key]);
}

/**
 * Genera una URL presignada para acceso temporal (si R2 lo soporta)
 * Nota: Cloudflare R2 no tiene presigned URLs nativas, pero podemos usar
 * Workers para servir archivos con autenticación
 */
export function generateFileURL(
  baseUrl: string,
  key: string,
  token?: string
): string {
  if (token) {
    return `${baseUrl}/api/files/${key}?token=${token}`;
  }
  return `${baseUrl}/api/files/${key}`;
}

