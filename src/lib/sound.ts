let audioCtx: AudioContext | null = null

function ensureAudioContext(): AudioContext {
  if (!audioCtx) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) throw new Error('当前浏览器不支持 Web Audio API')
    audioCtx = new Ctx()
  }
  return audioCtx
}

function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const comma = dataUrl.indexOf(',')
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  const binary = atob(base64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/** 使用 Web Audio API 播放 data URL 音效，避免 CSP 与 <audio> GC 问题 */
export async function playSoundFromDataUrl(dataUrl: string, volume: number): Promise<void> {
  const ctx = ensureAudioContext()
  // 在用户的点击/交互中恢复 AudioContext，否则会被浏览器自动播放策略挂起
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
  const buffer = dataUrlToArrayBuffer(dataUrl)
  const audioBuffer = await ctx.decodeAudioData(buffer)
  const source = ctx.createBufferSource()
  source.buffer = audioBuffer
  const gain = ctx.createGain()
  gain.gain.value = Math.max(0, Math.min(1, volume))
  source.connect(gain)
  gain.connect(ctx.destination)
  source.start(0)
}
