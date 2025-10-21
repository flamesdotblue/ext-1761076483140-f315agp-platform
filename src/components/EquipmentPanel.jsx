import React, { useMemo, useState } from 'react';

export default function EquipmentPanel({ equipment, reservations, currentMonth }) {
  const [active, setActive] = useState(null);

  const counts = useMemo(() => {
    const monthKey = `${currentMonth.getFullYear()}-${(currentMonth.getMonth()+1).toString().padStart(2,'0')}`;
    const map = {};
    for (const e of equipment) map[e.id] = 0;
    for (const r of reservations) {
      if (r.date.startsWith(monthKey)) {
        map[r.equipmentId] = (map[r.equipmentId] || 0) + 1;
      }
    }
    return map;
  }, [reservations, equipment, currentMonth]);

  return (
    <div className="rounded-lg border bg-white" aria-label="Equipment list">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h2 className="font-semibold">Equipment</h2>
        <span className="text-xs text-neutral-600">Drag to calendar</span>
      </div>
      <ul className="divide-y max-h-[420px] overflow-auto" role="listbox">
        {equipment.map(eq => (
          <li key={eq.id} className="p-3 hover:bg-neutral-50 focus-within:bg-neutral-50">
            <div className="flex items-center gap-3">
              <img src={eq.image} alt="" className="h-12 w-12 rounded object-cover" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <button
                    className="text-sm font-medium text-left hover:underline focus:underline"
                    onClick={() => setActive(active === eq.id ? null : eq.id)}
                    aria-expanded={active === eq.id}
                    aria-controls={`eq-details-${eq.id}`}
                  >
                    {eq.name}
                  </button>
                  <span className="text-xs text-neutral-600">{counts[eq.id] || 0} reservations</span>
                </div>
                <div className="text-xs text-neutral-600">{eq.type} • {eq.specs}</div>
              </div>
              <div
                role="button"
                tabIndex={0}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'equipment', equipmentId: eq.id }));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    navigator.clipboard?.writeText(eq.id);
                  }
                }}
                aria-label={`Drag ${eq.name} to calendar to reserve`}
                className="ml-2 inline-flex items-center gap-1 rounded border bg-white px-2 py-1 text-xs hover:bg-neutral-50"
                title="Drag to calendar"
              >
                Drag
              </div>
            </div>
            {active === eq.id && (
              <div id={`eq-details-${eq.id}`} className="mt-3 rounded-md border bg-neutral-50 p-3">
                <div className="text-sm font-medium mb-1">Profile</div>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-neutral-500">Type</dt>
                    <dd>{eq.type}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Specs</dt>
                    <dd>{eq.specs}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-neutral-500">Maintenance</dt>
                    <dd>
                      {eq.maintenance.length === 0 ? (
                        <span className="text-neutral-600">None scheduled</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {eq.maintenance.map(d => (
                            <span key={d} className="inline-flex items-center rounded-full bg-yellow-100 text-yellow-800 px-2 py-0.5">{d}</span>
                          ))}
                        </div>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
