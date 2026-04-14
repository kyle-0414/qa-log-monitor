import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity, ChevronLeft, ChevronRight, Monitor, FolderOpen, Search,
  Clock, Grid3X3, FileText, LayoutGrid, GitCompare, BarChart3, StickyNote
} from 'lucide-react';

const NAV_GROUPS = [
  {
    label: 'Monitoring',
    items: [
      { to: '/monitor', icon: Activity, label: 'Real-time Monitor' },
      { to: '/devices', icon: LayoutGrid, label: 'Multi-Device' },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { to: '/search', icon: Search, label: 'Error Search' },
      { to: '/reports', icon: FileText, label: 'Reports' },
      { to: '/timeline', icon: Clock, label: 'Timeline' },
      { to: '/compare', icon: GitCompare, label: 'Compare' },
      { to: '/heatmap', icon: Grid3X3, label: 'Image Heatmap' },
      { to: '/stats', icon: BarChart3, label: 'Statistics' },
    ],
  },
  {
    label: 'Files',
    items: [
      { to: '/logs', icon: FolderOpen, label: 'Log Browser' },
      { to: '/notes', icon: StickyNote, label: 'Error Notes' },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__header">
        {!collapsed && (
          <div className="sidebar__logo">
            <Monitor size={20} />
            <span>QA Log Monitor</span>
          </div>
        )}
        <button className="sidebar__toggle" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="sidebar__nav">
        {NAV_GROUPS.map(group => (
          <div key={group.label} className="sidebar__group">
            {!collapsed && <div className="sidebar__group-label">{group.label}</div>}
            {group.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `sidebar__item ${isActive ? 'sidebar__item--active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={18} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
