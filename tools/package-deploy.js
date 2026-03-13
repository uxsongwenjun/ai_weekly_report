#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const buildDir = path.join(rootDir, ".next");
const standaloneDir = path.join(buildDir, "standalone");
const staticDir = path.join(buildDir, "static");
const publicDir = path.join(rootDir, "public");
const distDir = path.join(rootDir, "dist");
const bundleDir = path.join(distDir, "deploy");

function rmIfExists(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function ensureDir(target) {
  fs.mkdirSync(target, { recursive: true });
}

function copyIfExists(from, to) {
  if (!fs.existsSync(from)) return;
  fs.cpSync(from, to, { recursive: true });
}

function writeText(file, content) {
  fs.writeFileSync(file, content, "utf8");
}

function buildArchiveName() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `ai-weekly-report-deploy-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.zip`;
}

function hasCommand(command) {
  try {
    execSync(`command -v ${command}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function main() {
  if (!fs.existsSync(path.join(standaloneDir, "server.js"))) {
    throw new Error("Missing standalone build output. Run `npm run build` first.");
  }

  ensureDir(distDir);
  rmIfExists(bundleDir);
  ensureDir(bundleDir);

  copyIfExists(standaloneDir, bundleDir);
  copyIfExists(staticDir, path.join(bundleDir, ".next", "static"));
  copyIfExists(publicDir, path.join(bundleDir, "public"));
  copyIfExists(path.join(rootDir, "tools"), path.join(bundleDir, "tools"));
  copyIfExists(path.join(rootDir, "data"), path.join(bundleDir, "data"));
  copyIfExists(path.join(rootDir, ".env.example"), path.join(bundleDir, ".env.example"));

  writeText(
    path.join(bundleDir, "ecosystem.config.cjs"),
    `module.exports = {
  apps: [
    {
      name: "ai-weekly-report",
      script: "./server.js",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        DATABASE_PATH: "./data/weekly.db",
      },
    },
  ],
};
`
  );

  writeText(
    path.join(bundleDir, "DEPLOYMENT.txt"),
    [
      "Precompiled deployment bundle for ai-weekly-report",
      "",
      "Run:",
      "  1. Copy this folder to the server",
      "  2. Create .env.local if needed",
      "  3. Start with: node server.js",
      "     or: pm2 start ecosystem.config.cjs",
      "",
      "Notes:",
      "  - This bundle was created from the current local platform.",
      "  - If the server OS/CPU differs from the build machine, native modules may fail.",
      "  - better-sqlite3 is native and must match the target platform.",
      "",
    ].join("\n")
  );

  // Use .tar.gz which is natively supported on Ubuntu and via Git's tar on Windows
  const archiveName = buildArchiveName().replace(".zip", ".tar.gz");
  const archivePath = path.join(distDir, archiveName);
  rmIfExists(archivePath);
  // Use bash shell to ensure tar/zip commands are found (covers Git Bash on Windows)
  const shellOpts = { cwd: rootDir, stdio: "inherit", shell: process.platform === "win32" ? "bash" : "/bin/sh" };
  try {
    execSync(`tar -czf "${archivePath}" -C "${bundleDir}" .`, shellOpts);
  } catch {
    // fallback to zip
    execSync(`zip -r "${archivePath.replace(".tar.gz", ".zip")}" .`, { ...shellOpts, cwd: bundleDir });
  }

  console.log(
    JSON.stringify({
      ok: true,
      bundleDir,
      archivePath,
      standalone: true,
    })
  );
}

main();
