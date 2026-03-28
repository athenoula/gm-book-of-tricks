import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { WaxSeal } from './WaxSeal'
import { IconPickerModal } from './IconPickerModal'
import { SEAL_COLOURS } from './templates'
import type { HandoutSeal } from '@/lib/types'
import { uploadImage } from '@/lib/storage'

interface Props {
  seal: HandoutSeal | null
  campaignId: string
  onChange: (seal: HandoutSeal | null) => void
}

const DEFAULT_SEAL: HandoutSeal = {
  type: 'built',
  icon: 'GiCrossedSwords',
  ring_text: '',
  colour: '#c0392b',
  shape: 'round',
  position: { x: 80, y: 85 },
}

export function SealBuilder({ seal, campaignId, onChange }: Props) {
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [customColour, setCustomColour] = useState('')

  const activeSeal = seal ?? DEFAULT_SEAL

  const toggleSeal = () => {
    onChange(seal ? null : DEFAULT_SEAL)
  }

  const updateBuiltSeal = (updates: Partial<Extract<HandoutSeal, { type: 'built' }>>) => {
    if (activeSeal.type !== 'built') return
    onChange({ ...activeSeal, ...updates })
  }

  const handleUploadSeal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadImage(campaignId, 'seals', file)
    onChange({ type: 'uploaded', custom_image_url: url, position: activeSeal.position })
    e.target.value = ''
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted">Wax Seal</label>
        <Button size="sm" variant="ghost" onClick={toggleSeal}>
          {seal ? 'Remove' : '+ Add Seal'}
        </Button>
      </div>

      {seal && (
        <div className="space-y-3">
          {/* Seal preview */}
          <div className="flex gap-3 items-start">
            <WaxSeal seal={activeSeal} size={64} />
            <div className="flex-1 text-xs text-text-secondary">
              {activeSeal.type === 'built' ? (
                <>
                  <div className="text-text-body mb-1">{activeSeal.icon.replace(/^Gi/, '').replace(/([A-Z])/g, ' $1').trim()}</div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setShowIconPicker(true)}>Change Icon</Button>
                  </div>
                </>
              ) : (
                <div className="text-text-body">Custom seal image</div>
              )}
            </div>
          </div>

          {activeSeal.type === 'built' && (
            <>
              {/* Ring text */}
              <div>
                <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Ring Text</label>
                <Input
                  value={activeSeal.ring_text}
                  onChange={(e) => updateBuiltSeal({ ring_text: e.target.value })}
                  placeholder="e.g. House Ashara"
                />
              </div>

              {/* Colour swatches */}
              <div>
                <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Colour</label>
                <div className="flex gap-1.5 flex-wrap">
                  {SEAL_COLOURS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => updateBuiltSeal({ colour: c.value })}
                      className={`w-7 h-7 rounded-full cursor-pointer border-2 transition-colors ${
                        activeSeal.colour === c.value ? 'border-primary' : 'border-transparent'
                      }`}
                      style={{ background: c.value }}
                      title={c.name}
                    />
                  ))}
                  <Input
                    value={customColour}
                    onChange={(e) => { setCustomColour(e.target.value); if (/^#[0-9a-f]{6}$/i.test(e.target.value)) updateBuiltSeal({ colour: e.target.value }) }}
                    placeholder="#hex"
                    className="w-20 text-xs"
                  />
                </div>
              </div>

              {/* Shape */}
              <div>
                <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Shape</label>
                <div className="flex gap-1.5">
                  {(['round', 'shield', 'oval'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateBuiltSeal({ shape: s })}
                      className={`px-3 py-1 text-xs rounded-[--radius-sm] cursor-pointer border transition-colors ${
                        activeSeal.shape === s
                          ? 'bg-primary/20 border-primary text-primary-light'
                          : 'bg-bg-raised border-border text-text-muted'
                      }`}
                    >
                      {s === 'round' ? '● Round' : s === 'shield' ? '◆ Shield' : '⬮ Oval'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Upload custom option */}
          <div>
            <label className="text-xs text-primary cursor-pointer hover:underline">
              {activeSeal.type === 'built' ? 'or upload custom seal →' : 'Change image'}
              <input type="file" accept="image/*" onChange={handleUploadSeal} className="hidden" />
            </label>
          </div>
        </div>
      )}

      {showIconPicker && (
        <IconPickerModal
          onSelect={(iconName) => updateBuiltSeal({ icon: iconName })}
          onClose={() => setShowIconPicker(false)}
        />
      )}
    </div>
  )
}
