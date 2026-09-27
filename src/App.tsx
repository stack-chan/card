import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Popover } from '@/components/ui/popover'
import { Icon } from '@/components/icons'
import { FieldsPanel } from '@/components/editor/FieldsPanel'
import { BackgroundPicker, DesignPanel, OrientationPicker } from '@/components/editor/DesignPanel'
import { AvatarEditor } from '@/components/editor/AvatarEditor'
import { CardSvg } from '@/components/card/CardSvg'
import { BrandIcon } from '@/components/card/BrandIcon'
import { useAvatar } from '@/hooks/useAvatar'
import { computeLayout, createBrowserMeasure } from '@/lib/layout'
import { DEFAULT_DRAFT, STORAGE_KEY, cleanField, getPaperGeometry, loadDraft, type CardFields, type CardDesign } from '@/lib/model'
import { exportCard, type ExportFormat } from '@/lib/export'
const DRAFT_SAVE_DEBOUNCE_MS = 350

export default function App() {
  const [draft, setDraft] = React.useState(loadDraft)
  const [bleed, setBleed] = React.useState(false)
  const [guides, setGuides] = React.useState(false)
  const [busy, setBusy] = React.useState<ExportFormat | null>(null)
  const [error, setError] = React.useState('')
  const [avatar, changeAvatar] = useAvatar(setError)
  const [avatarRevision, setAvatarRevision] = React.useState(0)
  const [fontEpoch, setFontEpoch] = React.useState(0)
  const [exportOpen, setExportOpen] = React.useState(false)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const svgRef = React.useRef<SVGSVGElement>(null)
  const saveFailed = React.useRef(false)
  React.useEffect(() => {
    let active = true
    const refresh = () => { if (active) setFontEpoch(n => n + 1) }
    void document.fonts.ready.then(refresh)
    document.fonts.addEventListener('loadingdone', refresh)
    return () => { active = false; document.fonts.removeEventListener('loadingdone', refresh) }
  }, [])
  React.useEffect(() => {
    const save = () => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); saveFailed.current = false }
      catch {
        if (!saveFailed.current) setError('このブラウザでは編集内容を保存できません。')
        saveFailed.current = true
      }
    }
    const timer = setTimeout(save, DRAFT_SAVE_DEBOUNCE_MS)
    window.addEventListener('pagehide', save)
    return () => { clearTimeout(timer); window.removeEventListener('pagehide', save) }
  }, [draft])
  const measure = React.useMemo(() => createBrowserMeasure(), [fontEpoch])
  const paper = getPaperGeometry(draft.design.orientation, bleed)
  const layout = React.useMemo(() => computeLayout(draft.fields, draft.design.layout, measure, draft.design.orientation), [draft.fields, draft.design.layout, draft.design.orientation, measure])
  const fieldErrors: Partial<Record<keyof CardFields, string>> = {}
  layout.texts.filter(t => t.overflow).forEach(t => { fieldErrors[t.id] = '枠に収まりません。' })
  if (!draft.fields.name.trim()) fieldErrors.name = '名前を入力してください。'
  const invalid = Object.keys(fieldErrors).length > 0
  const small = layout.texts.some(t => t.id !== 'tagline' && t.text.trim() && t.font < 20)
  const changeField = (key: keyof CardFields, value: string) => setDraft(current => ({ ...current, fields: { ...current.fields, [key]: cleanField(value, key) } }))
  const changeDesign = (patch: Partial<CardDesign>) => setDraft(current => ({ ...current, design: { ...current.design, ...patch } }))
  const reset = () => {
    if (window.confirm('入力内容とデザインを初期値に戻しますか？')) {
      setDraft(structuredClone(DEFAULT_DRAFT))
      changeAvatar('')
      setAvatarRevision(n => n + 1)
      setBleed(false); setGuides(false); setSettingsOpen(false)
    }
  }
  const onExport = async (format: ExportFormat) => {
    if (!svgRef.current || invalid || busy) return
    setBusy(format); setError(''); setExportOpen(false)
    try { await exportCard(svgRef.current, format, bleed, draft.fields.name, draft.design.orientation) }
    catch (error) { setError(error instanceof Error ? error.message : '書き出しに失敗しました。') }
    finally { setBusy(null) }
  }
  return <div className="app-shell" data-orientation={draft.design.orientation} style={{ '--trim-ratio': paper.trimWidth / paper.trimHeight } as React.CSSProperties}>
    <style media="print">{`@page { size:${paper.width}mm ${paper.height}mm; margin:0; }
      html,body,.app-shell,.workspace,.preview-region,.paper-wrap,.preview-card { width:${paper.width}mm; height:${paper.height}mm; }
      .app-shell[data-orientation] .paper-wrap { max-width:none; }`}</style>
    <header className="app-header">
      <h1 className="brand">Stack-chan <span>名刺</span>
        <small className="brand-version">v0.2.0
          <a href="https://github.com/stack-chan/card" target="_blank" rel="noopener noreferrer" aria-label="GitHubでcardのリポジトリを見る" title="GitHubでcardのリポジトリを見る">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><BrandIcon kind="github" size={24} /></svg>
          </a>
        </small>
      </h1>
      <Popover open={exportOpen} onOpenChange={setExportOpen} label="書き出し" align="end"
        trigger={<Button size="sm" aria-busy={!!busy} disabled={!!busy} className="export-button"><Icon name="download" size={16} /><span>{busy ? '書き出し中' : '書き出し'}</span></Button>}>
        <div className="export-options">
          <Button variant="ghost" disabled={invalid || !!busy} onClick={() => void onExport('png')}><Icon name="image" size={17} /><span>PNG</span><span className="option-meta">600 dpi</span></Button>
          <Button variant="ghost" disabled={invalid || !!busy} onClick={() => void onExport('svg')}><Icon name="code" size={17} /><span>SVG</span></Button>
          <Button variant="ghost" disabled={invalid || !!busy} onClick={() => void onExport('print')}><Icon name="print" size={17} /><span>印刷 / PDF</span></Button>
        </div>
        <div className="popover-divider" />
        <label className="check-label"><input type="checkbox" checked={bleed} onChange={e => setBleed(e.target.checked)} />塗り足し 3 mm</label>
        {invalid && <p className="export-error" role="alert">入力内容を確認してください。</p>}
      </Popover>
    </header>
    <main className="workspace">
      <aside className="editor-sidebar" aria-label="名刺の編集">
        <OrientationPicker design={draft.design} onChange={changeDesign} />
        <AvatarEditor key={avatarRevision} avatar={avatar} onChange={changeAvatar} onError={setError} />
        <FieldsPanel fields={draft.fields} onChange={changeField} errors={fieldErrors} />
        <section className="background-section" aria-labelledby="background-label">
          <div className="section-heading"><h2 id="background-label">背景</h2>
            <Popover open={settingsOpen} onOpenChange={setSettingsOpen} label="デザインの調整" align="start" side="top"
              trigger={<Button variant="ghost" size="icon" aria-label="デザインの調整" className="has-tooltip"><Icon name="settings" size={17} /><span className="tooltip">デザインの調整</span></Button>}>
              <DesignPanel design={draft.design} onChange={changeDesign} />
              <div className="popover-divider" />
              <label className="check-label"><input type="checkbox" checked={guides} onChange={e => setGuides(e.target.checked)} />ガイドを表示</label>
              <div className="popover-divider" />
              <Button variant="ghost" className="reset-button" onClick={reset}><Icon name="reset" size={15} />初期値に戻す</Button>
            </Popover>
          </div>
          <BackgroundPicker design={draft.design} onChange={changeDesign} />
        </section>
      </aside>
      <section className="preview-region" aria-label="名刺プレビュー">
        <div className="paper-wrap" style={{ '--paper-ratio': paper.width / paper.height } as React.CSSProperties}>
          <div className={`preview-card ${bleed ? 'with-bleed' : ''}`} data-testid="preview-card"><CardSvg ref={svgRef} draft={draft} layout={layout} bleed={bleed} guides={guides} avatar={avatar} /></div>
          <div className="paper-caption"><span>{small && !invalid ? '文字サイズが小さくなっています。' : ''}</span><span>{`${paper.width} × ${paper.height} mm`}</span></div>
        </div>
      </section>
    </main>
    {error && <div className="toast" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="通知を閉じる">×</button></div>}
  </div>
}
