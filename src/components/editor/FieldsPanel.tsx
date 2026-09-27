import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { FIELD_LIMITS, FIELD_LABELS, type CardFields } from '@/lib/model'

export function FieldsPanel({ fields, onChange, errors }: {
  fields: CardFields
  onChange: (key: keyof CardFields, value: string) => void
  errors: Partial<Record<keyof CardFields, string>>
}) {
  const ids: Record<keyof CardFields, string> = { name: 'name', latinName: 'latin', role: 'role', tagline: 'tagline', email: 'email', website1: 'website-1', website2: 'website-2', github: 'github', x: 'x' }
  return <div className="fields-panel">
    {(Object.keys(ids) as Array<keyof CardFields>).map(key => {
      const id = `field-${ids[key]}`
      const shared = {
        id, value: fields[key], maxLength: FIELD_LIMITS[key], autoComplete: key === 'email' ? 'email' : key === 'website1' || key === 'website2' ? 'url' : 'off',
        spellCheck: false, 'aria-invalid': !!errors[key], 'aria-describedby': errors[key] ? `${id}-error` : undefined,
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(key, e.target.value),
      }
      return <div className="form-field" key={key}>
        <Label htmlFor={id}>{FIELD_LABELS[key]}</Label>
        {key === 'role' || key === 'tagline'
          ? <Textarea {...shared} rows={key === 'tagline' ? 2 : 1} className={key === 'role' ? 'role-input' : ''} />
          : <Input {...shared} type={key === 'email' ? 'email' : key === 'website1' || key === 'website2' ? 'url' : 'text'} placeholder={key === 'website1' || key === 'website2' ? 'https://example.com' : undefined} aria-required={key === 'name' ? true : undefined} />}
        {errors[key] && <p id={`${id}-error`} className="field-error" role="alert">{errors[key]}</p>}
      </div>
    })}
  </div>
}
