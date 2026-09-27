import * as React from 'react'
import { AVATAR_STORAGE_KEY, loadAvatar } from '@/lib/avatar'

export function useAvatar(onError: (message: string) => void): [string, (value: string) => void] {
  const [avatar, setAvatar] = React.useState(loadAvatar)
  React.useEffect(() => {
    const save = () => {
      try {
        if (avatar) localStorage.setItem(AVATAR_STORAGE_KEY, avatar)
        else localStorage.removeItem(AVATAR_STORAGE_KEY)
      } catch { onError('画像をこのブラウザに保存できません。現在の画像は書き出せます。') }
    }
    const timer = setTimeout(save, 350)
    window.addEventListener('pagehide', save)
    return () => { clearTimeout(timer); window.removeEventListener('pagehide', save) }
  }, [avatar, onError])
  const changeAvatar = React.useCallback((value: string) => { onError(''); setAvatar(value) }, [onError])
  return [avatar, changeAvatar]
}
