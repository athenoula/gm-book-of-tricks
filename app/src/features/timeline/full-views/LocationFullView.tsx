export function LocationFullView({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-3 text-sm">
      {/* Banner image */}
      {data.image_url && (
        <div className="rounded-[--radius-md] overflow-hidden border border-border">
          <img
            src={data.image_url as string}
            alt={data.name as string}
            className="w-full h-40 object-cover"
          />
        </div>
      )}

      {/* Type badge */}
      {data.type && (
        <span className="text-[10px] text-success bg-success/10 px-2 py-0.5 rounded-[--radius-sm]">
          {data.type as string}
        </span>
      )}

      <Separator />

      {/* Description */}
      {data.description && (
        <div>
          <SectionHeader>Description</SectionHeader>
          <p className="text-xs text-text-body whitespace-pre-line">{data.description as string}</p>
        </div>
      )}

      {/* Notes */}
      {data.notes && (
        <div>
          <SectionHeader>Notes</SectionHeader>
          <p className="text-xs text-text-body whitespace-pre-line">{data.notes as string}</p>
        </div>
      )}

      {/* Map */}
      {data.map_url && (
        <>
          <Separator />
          <div>
            <SectionHeader>Map</SectionHeader>
            <div className="rounded-[--radius-md] overflow-hidden border border-border">
              <img
                src={data.map_url as string}
                alt={`Map of ${data.name as string}`}
                className="w-full max-h-60 object-contain bg-bg-raised"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Separator() {
  return <div className="border-t-2 border-success/30 my-1" />
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] text-success uppercase tracking-wider font-semibold mb-1">
      {children}
    </div>
  )
}
