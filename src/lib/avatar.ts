export const AVATAR_STORAGE_KEY = 'stackchan-card-studio:avatar:v1'
const MAX_STORED_LENGTH = 400000

export function validAvatar(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_STORED_LENGTH
    && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(value)
}

export function loadAvatar(): string {
  try { const value = localStorage.getItem(AVATAR_STORAGE_KEY); return validAvatar(value) ? value : '' }
  catch { return '' }
}

export async function prepareAvatar(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
    throw new Error('PNG・JPEG・WebPの画像を選んでください。')
  if (file.size > 10 * 1024 * 1024) throw new Error('画像は10MB以下にしてください。')
  const url = URL.createObjectURL(file)
  try {
    const img = new Image(); img.src = url
    try { await img.decode() } catch { throw new Error('画像を読み込めませんでした。別の画像を選んでください。') }
    if (!img.naturalWidth || !img.naturalHeight) throw new Error('画像を読み込めませんでした。')
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('画像を処理できませんでした。')
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 512, 512)
    const side = Math.min(img.naturalWidth, img.naturalHeight)
    ctx.drawImage(img, (img.naturalWidth-side)/2, (img.naturalHeight-side)/2, side, side, 0, 0, 512, 512)
    const result = canvas.toDataURL('image/jpeg', .86)
    if (!validAvatar(result)) throw new Error('画像を保存できるサイズまで縮小できませんでした。')
    return result
  } finally { URL.revokeObjectURL(url) }
}
