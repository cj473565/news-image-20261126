// One Day in One Image — World News, Thursday 26 November 2026.
//
// The repository holds the finished front page (entry.png, a 1024x1024
// JPEG poster) and this runner. Running the program hands the poster to
// the grader: it reads the artwork next to this file, proves it is a
// real JPEG or PNG inside the 1 MiB gate, writes it unchanged to
// entry.png in the output directory, then reads the copy back and
// compares SHA-256 digests so a truncated write can never slip through.
//
// Node 22, standard library only, no network. Outside the grader's
// container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_BYTES = 1024 * 1024;

function kindOf(bytes: Buffer): 'JPEG' | 'PNG' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'JPEG';
  }
  const pngMagic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && pngMagic.every((b, i) => bytes[i] === b)) {
    return 'PNG';
  }
  return null;
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function main(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  const artwork = await readFile(join(here, 'entry.png'));
  const kind = kindOf(artwork);
  if (kind === null) {
    throw new Error('entry.png is neither a JPEG nor a PNG');
  }
  if (artwork.length > MAX_BYTES) {
    throw new Error(`entry.png is ${artwork.length} bytes, over the 1 MiB gate`);
  }

  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  const target = join(outDir, 'entry.png');
  await mkdir(outDir, { recursive: true });
  await writeFile(target, artwork);

  const landed = await readFile(target);
  const landedSize = (await stat(target)).size;
  if (landedSize !== artwork.length) {
    throw new Error(`wrote ${landedSize} bytes, expected ${artwork.length}`);
  }
  if (kindOf(landed) !== kind) {
    throw new Error('the copy on disk lost its image magic bytes');
  }
  if (sha256(landed) !== sha256(artwork)) {
    throw new Error('the copy on disk does not match the artwork');
  }
  console.log(`entry.png: ${artwork.length} bytes (${kind}), sha256 ${sha256(artwork)}`);
}

await main();
