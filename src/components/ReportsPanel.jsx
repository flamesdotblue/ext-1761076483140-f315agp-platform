import React, { useMemo } from 'react';

export default function ReportsPanel({ equipment, reservations, currentMonth }) {
  const monthKey = `${currentMonth.getFullYear()}-${(currentMonth.getMonth()+1).toString().padStart(2,'0')}`;
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth()+1, 0).getDate();

  const stats = useMemo(() => {
    const byEq = new Map();
    for (const eq of equipment) byEq.set(eq.id, { reserved: 0, maintenance: 0 });
    for (const r of reservations) {
      if (r.date.startsWith(monthKey)) {
        const s = byEq.get(r.equipmentId) || { reserved: 0, maintenance: 0 };
        s.reserved += 1;
        byEq.set(r.equipmentId, s);
      }
    }
    for (const eq of equipment) {
      for (const d of eq.maintenance || []) {
        if (d.startsWith(monthKey)) {
          const s = byEq.get(eq.id) || { reserved: 0, maintenance: 0 };
          s.maintenance += 1;
          byEq.set(eq.id, s);
        }
      }
    }
    return Array.from(byEq.entries()).map(([eqId, s]) => ({ eqId, ...s }));
  }, [equipment, reservations, monthKey]);

  return (
    <div className="mt-6 rounded-lg border bg-white p-4" aria-label="Utilization reports">
      <h3 className="font-semibold mb-2">Utilization (This Month)</h3>
      <ul className="space-y-3">
        {stats.map(row => {
          const eq = equipment.find(e => e.id === row.eqId);
          const util = Math.min(100, Math.round((row.reserved / daysInMonth) * 100));
          const maint = Math.min(100, Math.round((row.maintenance / daysInMonth) * 100));
          return (
            <li key={row.eqId} className="text-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium">{eq?.name || row.eqId}</div>
                <div className="text-xs text-neutral-600">{row.reserved} reserved • {row.maintenance} maint</div>
              </div>
              <div className="mt-1 h-2 w-full rounded bg-neutral-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={util} aria-label={`Utilization ${util}%`}>
                <div className="h-2 rounded bg-blue-600" style={{ width: util + '%' }}></div>
              </div>
              <div className="mt-1 h-2 w-full rounded bg-neutral-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={maint} aria-label={`Maintenance ${maint}%`}>
                <div className="h-2 rounded bg-yellow-400" style={{ width: maint + '%' }}></div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
