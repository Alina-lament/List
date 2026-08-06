import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const DEFAULT_SOUND_NAME = 'complete.wav'

function createCompleteWav(): Buffer {
  const sampleRate = 44100
  const duration = 0.35
  const numSamples = Math.floor(sampleRate * duration)
  const bytesPerSample = 2
  const dataBytes = numSamples * bytesPerSample
  const buffer = Buffer.alloc(44 + dataBytes)

  // RIFF header
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataBytes, 4)
  buffer.write('WAVE', 8)
  // fmt chunk
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20) // PCM
  buffer.writeUInt16LE(1, 22) // mono
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * bytesPerSample, 28)
  buffer.writeUInt16LE(bytesPerSample, 32)
  buffer.writeUInt16LE(16, 34)
  // data chunk
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataBytes, 40)

  // 双音调 "叮"：880Hz + 1320Hz，带衰减包络
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    const envelope = Math.exp(-t * 6)
    const sample =
      Math.sin(2 * Math.PI * 880 * t) * 0.5 +
      Math.sin(2 * Math.PI * 1320 * t) * 0.35
    const value = sample * envelope * 0.9 * 32767
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, value)), 44 + i * bytesPerSample)
  }

  return buffer
}

/** 确保音效目录存在，并在首次运行时生成默认完成音效 */
export function ensureDefaultSounds(dataRoot: string): void {
  const soundsDir = join(dataRoot, 'sounds')
  if (!existsSync(soundsDir)) {
    mkdirSync(soundsDir, { recursive: true })
  }
  const completePath = join(soundsDir, DEFAULT_SOUND_NAME)
  if (!existsSync(completePath)) {
    writeFileSync(completePath, createCompleteWav())
  }
}

export function getSoundsFolder(dataRoot: string): string {
  return join(dataRoot, 'sounds')
}

export function listSounds(dataRoot: string): string[] {
  const soundsDir = getSoundsFolder(dataRoot)
  if (!existsSync(soundsDir)) return []
  return readdirSync(soundsDir).filter((f) => /\.(wav|mp3|ogg|flac|aac)$/i.test(f))
}

export function getSoundDataUrl(dataRoot: string, fileName: string): string | null {
  const soundsDir = getSoundsFolder(dataRoot)
  let filePath = join(soundsDir, fileName)
  // 兼容只传基础名（如 'complete'）的情况，默认尝试 .wav
  if (!existsSync(filePath) && !fileName.includes('.')) {
    filePath = `${filePath}.wav`
  }
  if (!existsSync(filePath)) return null
  const buf = readFileSync(filePath)
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'wav'
  const mime =
    ext === 'mp3' ? 'audio/mpeg' :
    ext === 'ogg' ? 'audio/ogg' :
    ext === 'flac' ? 'audio/flac' :
    ext === 'aac' ? 'audio/aac' :
    'audio/wav'
  return `data:${mime};base64,${buf.toString('base64')}`
}
