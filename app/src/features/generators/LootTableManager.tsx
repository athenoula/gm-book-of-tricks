import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiOpenTreasureChest, GiRollingDices } from '@/components/ui/icons'
import { rollD20 } from '@/lib/dnd'
import {
  useLootTables, useLootItems,
  useCreateLootTable, useDeleteLootTable,
  useCreateLootItem, useDeleteLootItem,
  RARITY_COLORS,
} from './useLootTables'

export function LootTableManager({ campaignId }: { campaignId: string }) {
  const { data: tables, isLoading } = useLootTables(campaignId)
  const createTable = useCreateLootTable()
  const deleteTable = useDeleteLootTable()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [activeTableId, setActiveTableId] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await createTable.mutateAsync({ campaign_id: campaignId, name: newName })
    setNewName('')
    setShowCreate(false)
  }

  if (isLoading) return <p className="text-text-muted text-sm">Loading...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl flex items-center gap-2"><GameIcon icon={GiOpenTreasureChest} size="xl" /> Loot Tables</h3>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ New Table'}
        </Button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-bg-base rounded-[--radius-md] border border-border p-3 mb-3 flex gap-2 items-end">
          <Input label="Table Name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Goblin Pockets" required className="flex-1" />
          <Button type="submit" size="sm" disabled={createTable.isPending}>Create</Button>
        </form>
      )}

      {tables && tables.length === 0 && (
        <div className="bg-bg-base rounded-[--radius-lg] border border-border p-8 text-center">
          <p className="text-text-secondary text-sm">No loot tables yet.</p>
        </div>
      )}

      <div className="space-y-2">
        {tables?.map((table) => (
          <div key={table.id} className="bg-bg-base rounded-[--radius-md] border border-border overflow-hidden">
            <button
              onClick={() => setActiveTableId(activeTableId === table.id ? null : table.id)}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-bg-raised transition-colors cursor-pointer"
            >
              <span className="text-text-heading font-medium flex-1">{table.name}</span>
              <span className="text-xs text-text-muted">{activeTableId === table.id ? '▾' : '▸'}</span>
            </button>

            {activeTableId === table.id && (
              <div className="border-t border-border p-3">
                <LootTableEditor
                  tableId={table.id}
                  onDelete={() => deleteTable.mutate({ id: table.id, campaignId })}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function LootTableEditor({ tableId, onDelete }: { tableId: string; onDelete: () => void }) {
  const { data: items } = useLootItems(tableId)
  const createItem = useCreateLootItem()
  const deleteItem = useDeleteLootItem()
  const [rollResult, setRollResult] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newMin, setNewMin] = useState('')
  const [newMax, setNewMax] = useState('')
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newQty, setNewQty] = useState('1')
  const [newRarity, setNewRarity] = useState('')

  const rolledItem = rollResult && items
    ? items.find((i) => rollResult >= i.d20_min && rollResult <= i.d20_max)
    : null

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    await createItem.mutateAsync({
      table_id: tableId,
      d20_min: parseInt(newMin, 10),
      d20_max: parseInt(newMax, 10),
      name: newName,
      description: newDesc || undefined,
      quantity: newQty || '1',
      rarity: newRarity || undefined,
    })
    setNewMin('')
    setNewMax('')
    setNewName('')
    setNewDesc('')
    setNewQty('1')
    setNewRarity('')
    setShowAdd(false)
  }

  return (
    <div>
      {/* Roll */}
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={() => setRollResult(rollD20())}
          className="w-12 h-12 rounded-full bg-bg-raised border-2 border-border text-text-heading font-mono font-bold hover:border-primary hover:text-primary transition-all cursor-pointer flex items-center justify-center"
        >
          {rollResult ?? <GameIcon icon={GiRollingDices} size="lg" />}
        </button>
        {rolledItem && (
          <div className="bg-primary-ghost border border-primary/20 rounded-[--radius-md] px-3 py-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-primary-light font-medium">{rolledItem.name}</span>
              {rolledItem.quantity && rolledItem.quantity !== '1' && (
                <span className="text-xs text-text-muted">×{rolledItem.quantity}</span>
              )}
              {rolledItem.rarity && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-[--radius-sm]" style={{ color: RARITY_COLORS[rolledItem.rarity] ?? '#9ca3af', backgroundColor: `${RARITY_COLORS[rolledItem.rarity] ?? '#9ca3af'}15` }}>
                  {rolledItem.rarity}
                </span>
              )}
            </div>
            {rolledItem.description && <p className="text-xs text-text-secondary mt-0.5">{rolledItem.description}</p>}
          </div>
        )}
      </div>

      {/* Items table */}
      {items && items.length > 0 && (
        <table className="w-full text-sm mb-3">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs text-text-muted py-1 w-16">Range</th>
              <th className="text-left text-xs text-text-muted py-1">Item</th>
              <th className="text-left text-xs text-text-muted py-1 w-12">Qty</th>
              <th className="text-left text-xs text-text-muted py-1 w-20">Rarity</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className={`border-b border-border/30 ${rollResult && rollResult >= item.d20_min && rollResult <= item.d20_max ? 'bg-primary/10' : ''}`}
              >
                <td className="py-1.5 font-mono text-text-muted text-xs">
                  {item.d20_min === item.d20_max ? item.d20_min : `${item.d20_min}–${item.d20_max}`}
                </td>
                <td className="py-1.5 text-text-body">{item.name}</td>
                <td className="py-1.5 text-text-muted text-xs">{item.quantity}</td>
                <td className="py-1.5">
                  {item.rarity && (
                    <span className="text-[10px]" style={{ color: RARITY_COLORS[item.rarity] ?? '#9ca3af' }}>
                      {item.rarity}
                    </span>
                  )}
                </td>
                <td>
                  <button onClick={() => deleteItem.mutate({ id: item.id, tableId })} className="text-text-muted hover:text-danger text-xs cursor-pointer">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => setShowAdd(!showAdd)}>+ Add Item</Button>
        <Button size="sm" variant="ghost" onClick={onDelete} className="text-danger hover:text-danger">Delete Table</Button>
      </div>

      {showAdd && (
        <form onSubmit={handleAddItem} className="mt-2 grid grid-cols-6 gap-2 items-end">
          <Input label="Min" type="number" value={newMin} onChange={(e) => setNewMin(e.target.value)} required min={1} max={20} />
          <Input label="Max" type="number" value={newMax} onChange={(e) => setNewMax(e.target.value)} required min={1} max={20} />
          <Input label="Item Name" value={newName} onChange={(e) => setNewName(e.target.value)} required />
          <Input label="Qty" value={newQty} onChange={(e) => setNewQty(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary font-medium">Rarity</label>
            <select value={newRarity} onChange={(e) => setNewRarity(e.target.value)} className="px-2 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body text-sm">
              <option value="">—</option>
              <option value="common">Common</option>
              <option value="uncommon">Uncommon</option>
              <option value="rare">Rare</option>
              <option value="very rare">Very Rare</option>
              <option value="legendary">Legendary</option>
              <option value="artifact">Artifact</option>
            </select>
          </div>
          <Button type="submit" size="sm" disabled={createItem.isPending}>Add</Button>
        </form>
      )}
    </div>
  )
}
