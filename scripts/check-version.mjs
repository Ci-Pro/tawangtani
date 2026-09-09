#!/usr/bin/env node
/**
 * Guard konsistensi versi aplikasi (APP_VERSON_GUARD).
 *
 * Aturan:
 *  1. app.json version === package.json version (dua-titik-tunggal yang sinkron).
 *  2. android.versionCode === ios.buildNumber (nomor build identik lintas platform).
 *  3. keduanya integer >= 1.
 *
 * Darimana angka berasal: eas.json TIDAK memakai appVersionSource:remote, jadi
 * nomor di app.json inilah yang benar-benar dipakai oleh EAS lokal-preview.
 * production memakai autoIncrement:true -> EAS menaikkan kedua nilai di app.json.
 *
 * Pemakaian:  npm run check:version   (dari root)
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const app = JSON.parse(readFileSync(resolve(root, 'app.json'), 'utf-8'));
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
const expo = app.expo;

let failures = 0;
const appVersion = expo.version;
const pkgVersion = pkg.version;
const androidCode = Number(expo.android?.versionCode);
const iosBuild = Number(expo.ios?.buildNumber);

if (typeof appVersion !== 'string' || !/^\d+\.\d+\.\d+$/.test(appVersion)) {
  failures++;
  console.error(`GAGAL: app.json version harus semver "X.Y.Z", sekarang "${appVersion}".`);
}

if (appVersion !== pkgVersion) {
  failures++;
  console.error(`GAGAL: package.json version "${pkgVersion}" != app.json version "${appVersion}".`);
}

if (!Number.isInteger(androidCode) || androidCode < 1) {
  failures++;
  console.error(`GAGAL: app.json android.versionCode harus integer >= 1, sekarang "${expo.android?.versionCode}".`);
}

if (!Number.isInteger(iosBuild) || iosBuild < 1) {
  failures++;
  console.error(`GAGAL: app.json ios.buildNumber wajib integer >= 1, sekarang "${expo.ios?.buildNumber}".`);
}

if (androidCode !== iosBuild) {
  failures++;
  console.error(`GAGAL: nomor build lintas platform tidak sinkron — android ${androidCode} != ios ${iosBuild}.`);
}

if (failures > 0) {
  console.error(`Versi aplikasi tidak konsisten (${failures} masalah).`);
  process.exit(1);
}

console.log(`Versi konsisten: TAWANGTANI v${appVersion} (build android=${androidCode}, ios=${iosBuild}).`);