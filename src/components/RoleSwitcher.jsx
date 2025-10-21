import React from 'react';

const roles = [
  { id: 'admin', label: 'Admin' },
  { id: 'scheduler', label: 'Scheduler' },
  { id: 'operator', label: 'Operator (View Only)' },
];

export default function RoleSwitcher({ role, onChange }) {
  return (
    <div className="flex items-center gap-2" aria-label="User role selector">
      <label htmlFor="role" className="text-sm text-neutral-700">Role</label>
      <select
        id="role"
        value={role}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-describedby="role-help"
      >
        {roles.map(r => (
          <option key={r.id} value={r.id}>{r.label}</option>
        ))}
      </select>
      <span id="role-help" className="sr-only">Controls permissions: admin full access, scheduler can create and modify reservations, operator read-only.</span>
    </div>
  );
}
