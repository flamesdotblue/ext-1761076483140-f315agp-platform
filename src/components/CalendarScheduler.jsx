import React, { useMemo, useRef, useState } from 'react';

export default function CalendarScheduler({
  monthDays,
  equipment,
  reservations,
  projects,
  sites,
  rolePermissions,
  onCreate,
  onMove,
  onCancel,
  onAddMaintenance,
  onRemoveMaintenance,
}) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const gridRef = useRef(null);
  const [modal, setModal] = useState(null); // { dateKey, eqId? }

  const weeks = useMemo(() => chunkByWeeks(monthDays), [monthDays]);

  const resByDate = useMemo(() => {
    const m = new Map();
    for (const d of monthDays) m.set(formatDateKey(d), []);
    for (const r of reservations) {
      if (!m.has(r.date)) m.set(r.date, []);
      m.get(r.date).push(r);
    }
    return m;
  }, [reservations, monthDays]);

  function handleCellKeyDown(e, idx, date) {
    const cols = 7;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setFocusedIndex(Math.min(monthDays.length - 1, idx + 1));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setFocusedIndex(Math.max(0, idx - 1));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(Math.min(monthDays.length - 1, idx + cols));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(Math.max(0, idx - cols));
    } else if (e.key === 'Enter' && rolePermissions.canCreate) {
      e.preventDefault();
      setModal({ dateKey: formatDateKey(date) });
    }
  }

  function handleDropCreate(e, dateKey) {
    if (!rolePermissions.canCreate) return;
    const data = safeParseDataTransfer(e.dataTransfer.getData('text/plain'));
    if (!data) return;
    if (data.type === 'equipment') {
      setModal({ dateKey, eqId: data.equipmentId });
    } else if (data.type === 'reservation' && rolePermissions.canMove) {
      onMove(data.reservationId, dateKey);
    }
  }

  function dayCellMaintenanceState(dateKey) {
    // If any equipment has maintenance that day, show an indicator in cell header
    const anyMaint = equipment.some(eq => (eq.maintenance || []).includes(dateKey));
    return anyMaint;
  }

  return (
    <div className="">
      <div className="grid grid-cols-7 gap-px bg-neutral-200 text-xs font-medium text-neutral-600">
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <div key={d} className="bg-neutral-50 px-3 py-2">{d}</div>
        ))}
      </div>
      <div
        ref={gridRef}
        className="grid grid-cols-7 gap-px bg-neutral-200"
        role="grid"
        aria-label="Monthly calendar"
      >
        {monthDays.map((date, idx) => {
          const dateKey = formatDateKey(date);
          const day = date.getDate();
          const inMonth = date.getMonth() === monthDays[15]?.getMonth();
          const dayRes = resByDate.get(dateKey) || [];
          const anyMaint = dayCellMaintenanceState(dateKey);
          return (
            <div
              key={dateKey}
              role="gridcell"
              tabIndex={idx === focusedIndex ? 0 : -1}
              onKeyDown={(e) => handleCellKeyDown(e, idx, date)}
              onFocus={() => setFocusedIndex(idx)}
              aria-selected={idx === focusedIndex}
              aria-label={`Day ${date.toDateString()}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDropCreate(e, dateKey)}
              className={`min-h-[120px] bg-white p-2 outline-none focus:ring-2 focus:ring-blue-500 ${inMonth ? '' : 'bg-neutral-50 text-neutral-400'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-semibold">{day}</div>
                {anyMaint && (
                  <span className="inline-flex items-center gap-1 text-[10px] rounded bg-yellow-100 text-yellow-800 px-1.5 py-0.5" aria-label="Maintenance scheduled today">Maint</span>
                )}
              </div>

              <ul className="space-y-1" aria-label={`Reservations for ${date.toDateString()}`}>
                {dayRes.map(res => (
                  <ReservationChip
                    key={res.id}
                    res={res}
                    equipment={equipment.find(e => e.id === res.equipmentId)}
                    canMove={rolePermissions.canMove}
                    canCancel={rolePermissions.canCancel}
                    onMove={(dateKey) => onMove(res.id, dateKey)}
                    onCancel={() => onCancel(res.id)}
                  />
                ))}
              </ul>

              {rolePermissions.canCreate && (
                <button
                  type="button"
                  onClick={() => setModal({ dateKey })}
                  className="mt-2 w-full rounded border border-dashed px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50"
                  aria-label={`Create reservation on ${date.toDateString()}`}
                >
                  + Create
                </button>
              )}
            </div>
          );
        })}
      </div>

      {modal && (
        <ReservationModal
          dateKey={modal.dateKey}
          defaultEqId={modal.eqId}
          equipment={equipment}
          projects={projects}
          sites={sites}
          onClose={() => setModal(null)}
          onSubmit={(payload) => {
            const ok = onCreate(payload);
            if (ok) setModal(null);
          }}
        />
      )}
    </div>
  );
}

function ReservationChip({ res, equipment, canMove, canCancel, onMove, onCancel }) {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'reservation', reservationId: res.id }));
  };
  const color = res.status === 'reserved' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-green-100 text-green-800 border-green-200';
  return (
    <li className={`flex items-center justify-between rounded border px-2 py-1 text-xs ${color}`}
      draggable={canMove}
      onDragStart={canMove ? handleDragStart : undefined}
      aria-label={`Reservation for ${equipment?.name || res.equipmentId}`}
    >
      <div className="min-w-0 truncate">
        <span className="font-medium">{equipment?.name || res.equipmentId}</span>
        <span className="ml-1 text-neutral-600">• {res.projectId}</span>
      </div>
      {canCancel && (
        <button onClick={onCancel} className="ml-2 rounded bg-white/70 px-1.5 py-0.5 text-[10px] hover:bg-white" aria-label="Cancel reservation">Cancel</button>
      )}
    </li>
  );
}

function ReservationModal({ dateKey, defaultEqId, equipment, projects, sites, onClose, onSubmit }) {
  const [eqId, setEqId] = useState(defaultEqId || equipment[0]?.id || '');
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [siteId, setSiteId] = useState(sites[0]?.id || '');
  const [notify, setNotify] = useState(true);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true"></div>
      <div role="dialog" aria-modal="true" aria-labelledby="res-modal-title" className="relative z-40 w-full max-w-md rounded-lg border bg-white p-4 shadow-xl">
        <div className="mb-2">
          <h3 id="res-modal-title" className="text-lg font-semibold">Create Reservation</h3>
          <p className="text-sm text-neutral-600">Date: {dateKey}</p>
        </div>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ equipmentId: eqId, dateKey, projectId, siteId, notify });
          }}
        >
          <div>
            <label className="block text-sm font-medium">Equipment</label>
            <select value={eqId} onChange={(e) => setEqId(e.target.value)} className="mt-1 w-full rounded border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {equipment.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Project</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="mt-1 w-full rounded border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Job Site</label>
            <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="mt-1 w-full rounded border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {sites.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input id="notify" type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4" />
            <label htmlFor="notify" className="text-sm">Send confirmation email</label>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded border px-3 py-1 text-sm hover:bg-neutral-50">Cancel</button>
            <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function chunkByWeeks(days) {
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function safeParseDataTransfer(text) {
  try { return JSON.parse(text); } catch { return null; }
}
