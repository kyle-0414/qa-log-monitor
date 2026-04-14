import React, { useState } from 'react';
import { LayoutGrid, Plus } from 'lucide-react';
import DeviceCard from '../components/devices/DeviceCard';
import AddDeviceModal from '../components/devices/AddDeviceModal';

const STORAGE_KEY = 'qa-devices';

function loadDevices() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export default function DevicesPage() {
  const [devices, setDevices] = useState(loadDevices);
  const [showAdd, setShowAdd] = useState(false);

  const save = (list) => {
    setDevices(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const handleAdd = (device) => save([...devices, device]);
  const handleRemove = (id) => save(devices.filter(d => d.id !== id));

  return (
    <div className="devices-page">
      <div className="page-header">
        <h2><LayoutGrid size={20} /> Multi-Device Monitor</h2>
        <button className="btn btn--primary" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> 디바이스 추가
        </button>
      </div>

      {devices.length === 0 ? (
        <div className="centered-message">
          <LayoutGrid size={40} style={{ color: 'var(--text-dim)' }} />
          <span>등록된 디바이스가 없습니다</span>
          <button className="btn btn--primary" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> 첫 번째 디바이스 추가
          </button>
        </div>
      ) : (
        <div className="devices-grid">
          {devices.map(device => (
            <DeviceCard key={device.id} device={device} onRemove={handleRemove} />
          ))}
        </div>
      )}

      {showAdd && (
        <AddDeviceModal onAdd={handleAdd} onClose={() => setShowAdd(false)} />
      )}
    </div>
  );
}
