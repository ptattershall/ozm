import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl as getPresignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env["S3_BUCKET"];
const REGION = process.env["S3_REGION"] ?? "us-east-1";
const ENDPOINT = process.env["S3_ENDPOINT"]?.trim();
const ACCESS_KEY = process.env["S3_ACCESS_KEY_ID"];
const SECRET_KEY = process.env["S3_SECRET_ACCESS_KEY"];
/** Optional: public base URL for the bucket (e.g. CloudFront, R2 public bucket). If set, getPublicUrl uses this. */
const PUBLIC_BASE_URL = process.env["STORAGE_PUBLIC_BASE_URL"]?.replace(/\/$/, "");

const isR2 = Boolean(ENDPOINT && ENDPOINT.includes("r2.cloudflarestorage.com"));

function getClient(): S3Client {
  const credentials =
    ACCESS_KEY && SECRET_KEY
      ? { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY }
      : undefined;
  return new S3Client({
    region: isR2 ? "auto" : REGION,
    ...(ENDPOINT ? { endpoint: ENDPOINT, forcePathStyle: isR2 } : {}),
    ...(credentials ? { credentials } : {}),
  });
}

let client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!client) client = getClient();
  return client;
}

/** Folder conventions (see IMPLEMENTATION_CHECKLIST §6). */
export const storagePaths = {
  /** SVGs: `svgs/{id}.svg` */
  svgKey: (id: string) => `svgs/${id}.svg`,
  /** Exports: `exports/{designId}/{size}.png` */
  exportKey: (designId: string, size: number) =>
    `exports/${designId}/${size}.png`,
  /** Thumbnails: `thumbnails/{designId}.png` */
  thumbnailKey: (designId: string) => `thumbnails/${designId}.png`,
  /** Assets: `assets/{pack}/{asset}.svg` */
  assetKey: (pack: string, asset: string) => `assets/${pack}/${asset}.svg`,
} as const;

/**
 * Upload a file to object storage.
 * @returns The object key (use with getSignedUrl or getPublicUrl to form a URL).
 */
export async function putObject(
  key: string,
  body: string | Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  if (!BUCKET) throw new Error("S3_BUCKET is not set");
  const client = getS3Client();
  const input: PutObjectCommandInput = {
    Bucket: BUCKET,
    Key: key,
    Body: typeof body === "string" ? Buffer.from(body, "utf-8") : body,
    ContentType: contentType,
  };
  await client.send(new PutObjectCommand(input));
  return key;
}

/**
 * Get a presigned GET URL for private object access.
 * @param key - Object key returned from putObject or storagePaths.
 * @param expiresIn - Seconds until the URL expires (default 3600).
 */
export async function getSignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  if (!BUCKET) throw new Error("S3_BUCKET is not set");
  const client = getS3Client();
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getPresignedUrl(client, command, { expiresIn });
}

/**
 * Get the public URL for an object.
 * Use when the bucket (or a CDN in front of it) is configured for public read.
 * Set STORAGE_PUBLIC_BASE_URL to your bucket public URL or CDN base (e.g. https://pub-xxx.r2.dev or CloudFront).
 * If not set, returns the key only (caller may use getSignedUrl for private buckets).
 */
export function getPublicUrl(key: string): string {
  if (PUBLIC_BASE_URL) return `${PUBLIC_BASE_URL}/${key}`;
  return key;
}

/**
 * Upload an SVG string and return a URL.
 * Prefer getPublicUrl when the bucket is public; otherwise use getSignedUrl for private access.
 */
export async function uploadSvgAndGetUrl(
  id: string,
  svgContent: string
): Promise<{ key: string; url: string }> {
  const key = storagePaths.svgKey(id);
  await putObject(key, svgContent, "image/svg+xml");
  const url = PUBLIC_BASE_URL ? getPublicUrl(key) : await getSignedUrl(key);
  return { key, url };
}
