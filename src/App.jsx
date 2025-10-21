import React, { useMemo, useState } from 'react';
import RoleSwitcher from './components/RoleSwitcher';
import EquipmentPanel from './components/EquipmentPanel';
import CalendarScheduler from './components/CalendarScheduler';
import ReportsPanel from './components/ReportsPanel';

function App() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  // Roles: admin, scheduler, operator
  const [role, setRole] = useState('scheduler');

  const [projects] = useState([
    { id: 'p1', name: 'Downtown Office Tower' },
    { id: 'p2', name: 'Riverside Bridge Repair' },
    { id: 'p3', name: 'West Industrial Park' },
  ]);

  const [sites] = useState([
    { id: 's1', name: 'Site A - North Yard' },
    { id: 's2', name: 'Site B - Riverbank' },
    { id: 's3', name: 'Site C - Logistics Hub' },
  ]);

  const [equipment, setEquipment] = useState([
    {
      id: 'eq1',
      name: 'Excavator CAT 320',
      type: 'Excavator',
      specs: '159 HP, 21.9 ton, 1.0 m³ bucket',
      image: 'https://images.unsplash.com/photo-1645012921130-74112edcae50?ixid=M3w3OTkxMTl8MHwxfHNlYXJjaHwxfHxFeGNhdmF0b3IlMjBDQVQlMjAzMjB8ZW58MHwwfHx8MTc2MTA3MjA4NXww&ixlib=rb-4.1.0&w=1600&auto=format&fit=crop&q=80',
      maintenance: ['2025-10-23', '2025-11-10'],
    },
    {
      id: 'eq2',
      name: 'Mobile Crane Liebherr LTM 1050',
      type: 'Crane',
      specs: '50 t capacity, 38 m boom',
      image: 'https://images.unsplash.com/photo-1690289059773-326b60dbac1d?ixid=M3w3OTkxMTl8MHwxfHNlYXJjaHwxfHxNb2JpbGUlMjBDcmFuZSUyMExpZWJoZXJyJTIwTFRNJTIwMTA1MHxlbnwwfDB8fHwxNzYxMDc2NjE2fDA&ixlib=rb-4.1.0&w=1600&auto=format&fit=crop&q=80',
      maintenance: ['2025-10-25'],
    },
    {
      id: 'eq3',
      name: 'Bulldozer Komatsu D65',
      type: 'Bulldozer',
      specs: '205 HP, 21.5 t, Semi-U blade',
      image: 'https://images.unsplash.com/photo-1571414793707-820e48aea639?ixid=M3w3OTkxMTl8MHwxfHNlYXJjaHwxfHxCdWxsZG96ZXIlMjBLb21hdHN1JTIwRDY1fGVufDB8MHx8fDE3NjEwNzIwODV8MA&ixlib=rb-4.1.0&w=1600&auto=format&fit=crop&q=80',
      maintenance: [],
    },
  ]);

  const [reservations, setReservations] = useState([
    {
      id: 'r1',
      equipmentId: 'eq1',
      date: formatDateKey(today),
      status: 'reserved',
      projectId: 'p1',
      siteId: 's1',
      notify: true,
    },
  ]);

  const [notificationLog, setNotificationLog] = useState([]);
  const [message, setMessage] = useState(null);

  const monthDays = useMemo(() => generateMonthDays(currentMonth), [currentMonth]);

  function formatDateKeySafe(d) {
    if (!(d instanceof Date)) return d;
    return formatDateKey(d);
  }

  function handlePrevMonth() {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() - 1);
    setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  }
  function handleNextMonth() {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() + 1);
    setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  function isMaintenance(equipmentId, dateKey) {
    const eq = equipment.find(e => e.id === equipmentId);
    if (!eq) return false;
    return eq.maintenance.includes(dateKey);
  }

  function hasReservation(equipmentId, dateKey, excludeId) {
    return reservations.some(r => r.equipmentId === equipmentId && r.date === dateKey && r.id !== excludeId);
  }

  function createReservation({ equipmentId, dateKey, projectId, siteId, notify }) {
    // Conflict detection
    if (isMaintenance(equipmentId, dateKey)) {
      setMessage({ type: 'error', text: 'Cannot reserve: equipment under maintenance that day.' });
      return false;
    }
    if (hasReservation(equipmentId, dateKey)) {
      setMessage({ type: 'error', text: 'Conflict: equipment already reserved on that date.' });
      return false;
    }
    const id = 'r_' + Math.random().toString(36).slice(2, 9);
    const newRes = { id, equipmentId, date: dateKey, status: 'reserved', projectId, siteId, notify: !!notify };
    setReservations(prev => [...prev, newRes]);
    if (notify) sendEmailNotification('confirmation', newRes);
    setMessage({ type: 'success', text: 'Reservation created.' });
    return true;
  }

  function moveReservation(resId, newDateKey) {
    setReservations(prev => {
      const res = prev.find(r => r.id === resId);
      if (!res) return prev;
      if (isMaintenance(res.equipmentId, newDateKey)) {
        setMessage({ type: 'error', text: 'Cannot move: maintenance on that date.' });
        return prev;
      }
      if (hasReservation(res.equipmentId, newDateKey, resId)) {
        setMessage({ type: 'error', text: 'Cannot move: conflict with another reservation.' });
        return prev;
      }
      const updated = prev.map(r => r.id === resId ? { ...r, date: newDateKey } : r);
      sendEmailNotification('change', { ...res, date: newDateKey });
      setMessage({ type: 'success', text: 'Reservation updated.' });
      return updated;
    });
  }

  function cancelReservation(resId) {
    const res = reservations.find(r => r.id === resId);
    setReservations(prev => prev.filter(r => r.id !== resId));
    if (res) sendEmailNotification('cancellation', res);
    setMessage({ type: 'success', text: 'Reservation cancelled.' });
  }

  function sendEmailNotification(type, reservation) {
    const types = {
      confirmation: 'Reservation Confirmation',
      change: 'Reservation Updated',
      cancellation: 'Reservation Cancelled',
      reminder: 'Reservation Reminder',
    };
    const entry = {
      id: 'n_' + Math.random().toString(36).slice(2, 9),
      type,
      subject: types[type] || 'Notification',
      timestamp: new Date().toISOString(),
      reservation,
    };
    setNotificationLog(prev => [entry, ...prev]);
  }

  const rolePermissions = useMemo(() => ({
    canCreate: role === 'admin' || role === 'scheduler',
    canMove: role === 'admin' || role === 'scheduler',
    canCancel: role === 'admin' || role === 'scheduler',
    canEditMaintenance: role === 'admin',
  }), [role]);

  function addMaintenance(equipmentId, dateKey) {
    if (!rolePermissions.canEditMaintenance) return;
    setEquipment(prev => prev.map(e => e.id === equipmentId ? { ...e, maintenance: Array.from(new Set([...(e.maintenance || []), dateKey])) } : e));
    setMessage({ type: 'success', text: 'Maintenance scheduled.' });
  }

  function removeMaintenance(equipmentId, dateKey) {
    if (!rolePermissions.canEditMaintenance) return;
    setEquipment(prev => prev.map(e => e.id === equipmentId ? { ...e, maintenance: (e.maintenance || []).filter(d => d !== dateKey) } : e));
    setMessage({ type: 'success', text: 'Maintenance removed.' });
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Construction Resource Scheduler</h1>
          <div className="flex items-center gap-2">
            <RoleSwitcher role={role} onChange={setRole} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {message && (
          <div role="status" aria-live="polite" className={`mb-4 rounded-md px-4 py-2 text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <section className="xl:col-span-1">
            <EquipmentPanel
              equipment={equipment}
              reservations={reservations}
              currentMonth={currentMonth}
            />
            <div className="mt-6 rounded-lg border bg-white p-4">
              <h3 className="font-semibold mb-2">Legend</h3>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full bg-green-500" aria-hidden="true"></span> Available</li>
                <li className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full bg-red-500" aria-hidden="true"></span> Reserved</li>
                <li className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full bg-yellow-400" aria-hidden="true"></span> Maintenance</li>
              </ul>
            </div>
            <ReportsPanel equipment={equipment} reservations={reservations} currentMonth={currentMonth} />
          </section>

          <section className="xl:col-span-3">
            <div className="rounded-lg border bg-white">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                  <button aria-label="Previous month" className="px-2 py-1 rounded border hover:bg-neutral-50" onClick={handlePrevMonth}>&lt;</button>
                  <button aria-label="Next month" className="px-2 py-1 rounded border hover:bg-neutral-50" onClick={handleNextMonth}>&gt;</button>
                  <div className="ml-2 font-semibold" aria-live="polite">{currentMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
                </div>
                <div className="text-sm text-neutral-600">Drag equipment into a date to reserve. Drag reservations to move. Use Enter to open create form on a focused day.</div>
              </div>
              <CalendarScheduler
                monthDays={monthDays}
                equipment={equipment}
                reservations={reservations}
                projects={projects}
                sites={sites}
                rolePermissions={rolePermissions}
                onCreate={createReservation}
                onMove={moveReservation}
                onCancel={cancelReservation}
                onAddMaintenance={addMaintenance}
                onRemoveMaintenance={removeMaintenance}
              />
            </div>

            <div className="mt-4 text-xs text-neutral-600">
              Automated email notifications are simulated and logged locally for confirmations, updates, and cancellations.
            </div>

            <div className="mt-2 rounded-md border bg-white p-3">
              <h3 className="font-semibold">Notification Log</h3>
              <ul className="mt-2 space-y-1 max-h-40 overflow-auto" aria-label="Notification log">
                {notificationLog.length === 0 && (
                  <li className="text-neutral-500 text-sm">No notifications yet.</li>
                )}
                {notificationLog.map(n => (
                  <li key={n.id} className="text-sm flex items-start gap-2">
                    <span className="mt-1 inline-block h-2 w-2 rounded-full bg-blue-500" aria-hidden="true"></span>
                    <div>
                      <div className="font-medium">{n.subject}</div>
                      <div className="text-neutral-600">{new Date(n.timestamp).toLocaleString()} • Equipment {n.reservation?.equipmentId} on {n.reservation?.date}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-neutral-500">© {new Date().getFullYear()} ApexBuild Scheduling</footer>
    </div>
  );
}

export default App;

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function generateMonthDays(anchorDate) {
  const first = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const last = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);

  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7)); // Monday start

  const end = new Date(last);
  end.setDate(last.getDate() + (7 - ((last.getDay() + 6) % 7) - 1)); // Sunday end

  const days = [];
  const d = new Date(start);
  while (d <= end) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}
