import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

const DEFAULT_PORT = 2022;

export default function AddDeviceModal({ onAdd, onClose }) {
  const [form, setForm] = useState({ label: '', host: '', port: DEFAULT_PORT, username: 'milabr', password: '' });
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.host.trim()) return setError('호스트(IP)를 입력하세요');
    if (!form.username.trim()) return setError('사용자명을 입력하세요');
    setError('');
    onAdd({
      id: Date.now().toString(),
      label: form.label.trim() || form.host,
      host: form.host.trim(),
      port: parseInt(form.port) || DEFAULT_PORT,
      username: form.username.trim(),
      password: form.password,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-box__header">
          <div className="modal-box__title"><Plus size={15} /> 디바이스 추가</div>
          <button className="btn btn--ghost" onClick={onClose} style={{ padding: '2px 6px' }}><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-box__body">
            <div className="form-row">
              <label className="form-label">레이블 (선택)</label>
              <input className="form-input" type="text" value={form.label} onChange={e => set('label', e.target.value)} placeholder="예: Device A" />
            </div>
            <div className="form-row">
              <label className="form-label">호스트 / IP *</label>
              <input className="form-input" type="text" value={form.host} onChange={e => set('host', e.target.value)} placeholder="192.168.128.104" required />
            </div>
            <div className="form-row">
              <label className="form-label">포트</label>
              <input className="form-input" type="number" value={form.port} onChange={e => set('port', e.target.value)} placeholder="2022" />
            </div>
            <div className="form-row">
              <label className="form-label">사용자명 *</label>
              <input className="form-input" type="text" value={form.username} onChange={e => set('username', e.target.value)} required />
            </div>
            <div className="form-row">
              <label className="form-label">비밀번호</label>
              <input className="form-input" type="password" value={form.password} onChange={e => set('password', e.target.value)} />
            </div>
            {error && <div className="text-red" style={{ fontSize: 12, marginTop: 4 }}>{error}</div>}
          </div>
          <div className="modal-box__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>취소</button>
            <button type="submit" className="btn btn--primary"><Plus size={13} /> 추가</button>
          </div>
        </form>
      </div>
    </div>
  );
}
