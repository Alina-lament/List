// 将 better-sqlite3 重建为当前 Electron 版本的 ABI。
// 运行 vitest（Node 环境）会把模块翻转为 Node ABI，之后须执行本脚本恢复，
// 否则 npm run dev / 打包后的应用无法加载原生模块。
import { rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'

const require = createRequire(import.meta.url)
const version = require('electron/package.json').version

console.log(`Rebuilding better-sqlite3 for Electron ${version}...`)
rmSync('node_modules/better-sqlite3/build', { recursive: true, force: true })

const result = spawnSync('npx', ['prebuild-install', '--runtime=electron', `--target=${version}`], {
  cwd: 'node_modules/better-sqlite3',
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

if (result.status !== 0) {
  console.error('Rebuild failed.')
  process.exit(result.status ?? 1)
}
console.log('Done.')
