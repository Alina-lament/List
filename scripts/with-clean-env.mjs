// 启动前清除 ELECTRON_RUN_AS_NODE（某些环境会全局设置该变量，导致 Electron 以纯 Node 模式运行）
delete process.env.ELECTRON_RUN_AS_NODE

const { spawn } = await import('node:child_process')
const [cmd, ...args] = process.argv.slice(2)

if (!cmd) {
  console.error('Usage: node scripts/with-clean-env.mjs <cmd> [args...]')
  process.exit(1)
}

const child = spawn(cmd, args, {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
})
child.on('exit', (code) => process.exit(code ?? 0))
