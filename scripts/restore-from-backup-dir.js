#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const tsNodeBin = path.join(rootDir, 'node_modules', 'ts-node', 'dist', 'bin.js');
const scriptPath = path.join(__dirname, 'restore-from-backup-dir.ts');

const args = [
  tsNodeBin,
  '-T',
  '-r', 'tsconfig-paths/register',
  scriptPath,
  ...process.argv.slice(2)
];

const env = {
  ...process.env,
  TS_NODE_COMPILER_OPTIONS: JSON.stringify({ module: 'commonjs', moduleResolution: 'node' }),
};

const res = spawnSync(process.execPath, args, {
  stdio: 'inherit',
  env,
  cwd: rootDir,
});

process.exit(res.status || 0);
