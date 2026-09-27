import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/icons'
import { prepareAvatar } from '@/lib/avatar'

export function AvatarEditor({ avatar, onChange, onError }: {
  avatar: string; onChange: (value: string) => void; onError: (message: string) => void
}) {
  const [loading, setLoading] = React.useState(false)
  const request = React.useRef(0)
  const fileInput = React.useRef<HTMLInputElement>(null)
  const selectButton = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => () => { request.current++ }, [])
  const selectImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file) return
    const id = ++request.current; setLoading(true)
    try { const data = await prepareAvatar(file); if (id === request.current) onChange(data) }
    catch (error) { if (id === request.current) onError(error instanceof Error ? error.message : '画像を読み込めませんでした。') }
    finally { if (id === request.current) setLoading(false) }
  }
  const selectLabel = loading ? '画像を処理中…' : avatar ? '画像を変更' : '画像を選ぶ'
  return <section className="avatar-editor" aria-labelledby="avatar-label" aria-busy={loading}>
    <h2 id="avatar-label">アイコン</h2>
    <div className="avatar-controls">
      {avatar && <img src={avatar} alt="選択中のアイコン" width={48} height={48} />}
      <div className="avatar-actions">
        <Button ref={selectButton} variant="ghost" size="icon" className="has-tooltip" disabled={loading}
          aria-label={selectLabel} onClick={() => fileInput.current?.click()}>
          <Icon name="image" size={18} /><span className="tooltip" aria-hidden="true">{selectLabel}</span>
        </Button>
        <input ref={fileInput} className="avatar-file" type="file" accept="image/png,image/jpeg,image/webp"
          disabled={loading} onChange={selectImage} tabIndex={-1} aria-label="アイコン画像ファイル" />
        {avatar && <Button variant="ghost" size="icon" className="has-tooltip" disabled={loading}
          aria-label="画像を削除" onClick={() => { onChange(''); selectButton.current?.focus() }}>
          <Icon name="trash" size={18} /><span className="tooltip" aria-hidden="true">画像を削除</span>
        </Button>}
      </div>
    </div>
  </section>
}
