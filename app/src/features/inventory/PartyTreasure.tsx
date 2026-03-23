import { useState } from 'react'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiOpenTreasureChest, GiTrashCan, GiGems } from '@/components/ui/icons'
import { Button } from '@/components/ui/Button'
import {
  usePartyTreasure,
  useAddToPartyTreasure,
  useUpdatePartyTreasure,
  useRemoveFromPartyTreasure,
} from './usePartyTreasure'
import { ItemSearch } from './ItemSearch'
import type { Item } from './useItems'

interface PartyTreasureProps {
  campaignId: string
}

export function PartyTreasure({ campaignId }: PartyTreasureProps) {
  const [showItemSearch, setShowItemSearch] = useState(false)
  const [showGoldInput, setShowGoldInput] = useState(false)
  const [goldAmount, setGoldAmount] = useState('')

  const { data: treasureItems = [], isLoading } = usePartyTreasure(campaignId)
  const addItem = useAddToPartyTreasure()
  const updateItem = useUpdatePartyTreasure()
  const removeItem = useRemoveFromPartyTreasure()

  // Gold entries shown prominently at the top
  const goldEntries = treasureItems.filter((item) => item.name.toLowerCase() === 'gold')
  const otherItems = treasureItems.filter((item) => item.name.toLowerCase() !== 'gold')
  const totalGold = goldEntries.reduce((sum, entry) => sum + entry.quantity, 0)

  const handleItemSelect = (item: Item) => {
    setShowItemSearch(false)
    addItem.mutate({
      campaign_id: campaignId,
      name: item.name,
      item_id: item.id,
      quantity: 1,
    })
  }

  const handleAddGold = () => {
    const amount = parseInt(goldAmount, 10)
    if (isNaN(amount) || amount <= 0) return

    // If a Gold entry already exists, update quantity on the first one
    if (goldEntries.length > 0) {
      const existing = goldEntries[0]
      updateItem.mutate({
        id: existing.id,
        campaign_id: campaignId,
        quantity: existing.quantity + amount,
      })
    } else {
      addItem.mutate({
        campaign_id: campaignId,
        name: 'Gold',
        quantity: amount,
      })
    }

    setGoldAmount('')
    setShowGoldInput(false)
  }

  const handleQuantityChange = (id: string, quantity: number) => {
    if (quantity < 1) return
    updateItem.mutate({ id, campaign_id: campaignId, quantity })
  }

  const handleNotesChange = (id: string, notes: string) => {
    updateItem.mutate({ id, campaign_id: campaignId, notes })
  }

  const handleRemove = (id: string) => {
    removeItem.mutate({ id, campaign_id: campaignId })
  }

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-amber-400">
            <GameIcon icon={GiOpenTreasureChest} size="lg" />
          </span>
          <h3 className="text-xl">Party Treasure</h3>
          {treasureItems.length > 0 && (
            <span className="text-[10px] text-text-muted font-label uppercase tracking-wider">
              ({treasureItems.length})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowGoldInput((prev) => !prev)
              setShowItemSearch(false)
            }}
          >
            + Add Gold
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowItemSearch(true)
              setShowGoldInput(false)
            }}
            disabled={addItem.isPending}
          >
            + Add Item
          </Button>
        </div>
      </div>

      {/* Gold quick-add input */}
      {showGoldInput && (
        <div className="mb-4 flex items-center gap-2 bg-bg-raised border border-border rounded-[--radius-md] px-3 py-2">
          <span className="text-amber-400 text-sm font-label uppercase tracking-wider shrink-0">
            GP
          </span>
          <input
            type="number"
            min="1"
            value={goldAmount}
            onChange={(e) => setGoldAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddGold()
              if (e.key === 'Escape') {
                setShowGoldInput(false)
                setGoldAmount('')
              }
            }}
            placeholder="Amount..."
            className="flex-1 bg-transparent text-sm text-text-heading placeholder:text-text-muted outline-none"
            autoFocus
          />
          <Button size="sm" onClick={handleAddGold} disabled={!goldAmount || addItem.isPending || updateItem.isPending}>
            Add
          </Button>
          <button
            onClick={() => {
              setShowGoldInput(false)
              setGoldAmount('')
            }}
            className="text-text-muted hover:text-text-secondary transition-colors text-xs"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Gold display */}
      {totalGold > 0 && (
        <div className="mb-4 flex items-center gap-3 bg-amber-900/20 border border-amber-700/30 rounded-[--radius-md] px-4 py-3">
          <span className="text-amber-400 font-label uppercase tracking-wider text-xs shrink-0">Gold</span>
          <span className="text-2xl font-mono text-amber-300 font-semibold leading-none">
            {totalGold.toLocaleString()}
          </span>
          <span className="text-amber-500/70 text-sm">gp</span>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => handleQuantityChange(goldEntries[0].id, goldEntries[0].quantity - 1)}
              className="w-6 h-6 flex items-center justify-center rounded bg-bg-base border border-border text-text-muted hover:text-text-body hover:border-border-active text-xs transition-colors"
              disabled={goldEntries[0].quantity <= 1}
            >
              −
            </button>
            <button
              onClick={() => handleQuantityChange(goldEntries[0].id, goldEntries[0].quantity + 1)}
              className="w-6 h-6 flex items-center justify-center rounded bg-bg-base border border-border text-text-muted hover:text-text-body hover:border-border-active text-xs transition-colors"
            >
              +
            </button>
            <button
              onClick={() => handleRemove(goldEntries[0].id)}
              className="ml-1 text-text-muted hover:text-danger transition-colors"
              title="Remove gold"
            >
              <GameIcon icon={GiTrashCan} size="xs" />
            </button>
          </div>
        </div>
      )}

      {/* Items list */}
      {isLoading ? (
        <p className="text-sm text-text-muted py-2">Loading treasure...</p>
      ) : otherItems.length === 0 && totalGold === 0 ? (
        <div className="text-center py-8 text-text-muted">
          <div className="mb-2 opacity-30">
            <GameIcon icon={GiOpenTreasureChest} size="3xl" />
          </div>
          <p className="text-sm">The party coffers are empty.</p>
          <p className="text-xs mt-1 opacity-60">Add gold or items to track the party's wealth.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {otherItems.map((entry) => (
            <div
              key={entry.id}
              className="rounded-[--radius-md] border border-border bg-bg-raised px-3 py-2"
            >
              <div className="flex items-center gap-2">
                {/* Item icon */}
                <span className="shrink-0 text-text-muted">
                  <GameIcon icon={GiGems} size="sm" />
                </span>

                {/* Item name */}
                <span className="flex-1 text-sm text-text-body font-medium leading-tight">
                  {entry.name}
                </span>

                {/* Quantity controls */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleQuantityChange(entry.id, entry.quantity - 1)}
                    className="w-5 h-5 flex items-center justify-center rounded bg-bg-base border border-border text-text-muted hover:text-text-body hover:border-border-active text-xs leading-none transition-colors"
                    disabled={entry.quantity <= 1}
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-mono text-text-heading">
                    {entry.quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(entry.id, entry.quantity + 1)}
                    className="w-5 h-5 flex items-center justify-center rounded bg-bg-base border border-border text-text-muted hover:text-text-body hover:border-border-active text-xs leading-none transition-colors"
                  >
                    +
                  </button>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => handleRemove(entry.id)}
                  className="shrink-0 text-text-muted hover:text-danger transition-colors ml-1"
                  title="Remove from treasure"
                >
                  <GameIcon icon={GiTrashCan} size="xs" />
                </button>
              </div>

              {/* Notes field */}
              <input
                type="text"
                value={entry.notes ?? ''}
                onChange={(e) => handleNotesChange(entry.id, e.target.value)}
                placeholder="Notes..."
                className="mt-1.5 w-full bg-transparent text-xs text-text-muted placeholder:text-text-muted/50 outline-none border-b border-transparent focus:border-border-active transition-colors"
              />
            </div>
          ))}
        </div>
      )}

      {/* Item search modal */}
      {showItemSearch && (
        <ItemSearch
          campaignId={campaignId}
          onSelect={handleItemSelect}
          onClose={() => setShowItemSearch(false)}
        />
      )}
    </div>
  )
}
