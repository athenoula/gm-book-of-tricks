import { useState } from 'react'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiBackpack, GiSwordSmithing, GiTrashCan } from '@/components/ui/icons'
import { Button } from '@/components/ui/Button'
import {
  useCharacterInventory,
  useAddToInventory,
  useUpdateInventoryItem,
  useRemoveFromInventory,
} from './useCharacterInventory'
import { useItems } from './useItems'
import { ItemSearch } from './ItemSearch'
import type { Item } from './useItems'

interface CharacterInventoryProps {
  characterId: string
  campaignId: string
}

export function CharacterInventory({ characterId, campaignId }: CharacterInventoryProps) {
  const [showInventory, setShowInventory] = useState(false)
  const [showItemSearch, setShowItemSearch] = useState(false)

  const { data: inventoryItems = [], isLoading } = useCharacterInventory(characterId)
  const { data: allItems = [] } = useItems(campaignId)
  const addToInventory = useAddToInventory()
  const updateItem = useUpdateInventoryItem()
  const removeFromInventory = useRemoveFromInventory()

  // Build a lookup map for fast item name resolution
  const itemsById = new Map<string, Item>(allItems.map((item) => [item.id, item]))

  const handleItemSelect = (item: Item) => {
    setShowItemSearch(false)
    addToInventory.mutate({
      item_id: item.id,
      character_id: characterId,
      campaign_id: campaignId,
      quantity: 1,
      equipped: false,
    })
  }

  const handleQuantityChange = (id: string, quantity: number) => {
    if (quantity < 1) return
    updateItem.mutate({ id, character_id: characterId, quantity })
  }

  const handleEquippedToggle = (id: string, equipped: boolean) => {
    updateItem.mutate({ id, character_id: characterId, equipped: !equipped })
  }

  const handleRemove = (id: string) => {
    removeFromInventory.mutate({ id, character_id: characterId })
  }

  const handleNotesChange = (id: string, notes: string) => {
    updateItem.mutate({ id, character_id: characterId, notes })
  }

  return (
    <div className="border-t border-border p-4">
      {/* Section toggle */}
      <button
        onClick={() => setShowInventory(!showInventory)}
        className="text-sm text-text-secondary hover:text-text-body cursor-pointer flex items-center gap-1.5 w-full"
      >
        <span>{showInventory ? '▾' : '▸'}</span>
        <GameIcon icon={GiBackpack} size="sm" />
        <span>Inventory</span>
        {inventoryItems.length > 0 && (
          <span className="ml-1 text-[10px] text-text-muted font-label uppercase tracking-wider">
            ({inventoryItems.length})
          </span>
        )}
      </button>

      {showInventory && (
        <div className="mt-3 space-y-1">
          {isLoading ? (
            <p className="text-sm text-text-muted px-1">Loading inventory...</p>
          ) : inventoryItems.length === 0 ? (
            <p className="text-sm text-text-muted px-1 py-2">No items yet.</p>
          ) : (
            inventoryItems.map((entry) => {
              const item = itemsById.get(entry.item_id)
              const itemName = item?.name ?? `Unknown item (${entry.item_id.slice(0, 6)}…)`
              const isStackable = item?.stackable ?? false

              return (
                <div
                  key={entry.id}
                  className={`rounded-[--radius-md] border px-3 py-2 transition-colors ${
                    entry.equipped
                      ? 'bg-primary-ghost border-primary/30'
                      : 'bg-bg-raised border-border'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {/* Equipped toggle */}
                    <button
                      onClick={() => handleEquippedToggle(entry.id, entry.equipped)}
                      title={entry.equipped ? 'Unequip' : 'Equip'}
                      className={`shrink-0 transition-colors ${
                        entry.equipped ? 'text-primary-light' : 'text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      <GameIcon icon={GiSwordSmithing} size="sm" />
                    </button>

                    {/* Item name */}
                    <span className="flex-1 text-sm text-text-body font-medium leading-tight">
                      {itemName}
                      {entry.equipped && (
                        <span className="ml-1.5 text-[10px] text-primary-light font-label uppercase tracking-wider">
                          equipped
                        </span>
                      )}
                    </span>

                    {/* Quantity controls (stackable items only) */}
                    {isStackable ? (
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
                    ) : (
                      <span className="text-xs text-text-muted font-mono shrink-0">×{entry.quantity}</span>
                    )}

                    {/* Remove button */}
                    <button
                      onClick={() => handleRemove(entry.id)}
                      className="shrink-0 text-text-muted hover:text-danger transition-colors ml-1"
                      title="Remove from inventory"
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
              )
            })
          )}

          {/* Add Item button */}
          <div className="pt-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowItemSearch(true)}
              disabled={addToInventory.isPending}
            >
              + Add Item
            </Button>
          </div>
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
