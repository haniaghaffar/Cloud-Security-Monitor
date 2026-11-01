import {
  LayoutDashboard,
  ShieldAlert,
  BellRing,
  FileSpreadsheet,
  FileCode,
  Settings,
} from 'lucide-react';
import { NavItem } from '../types';

export const NAVIGATION_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Overview',
    path: '/',
    icon: LayoutDashboard,
    description: 'Security health and high-level metrics',
  },
  {
    id: 'findings',
    label: 'Threat Timeline',
    path: '/findings',
    icon: ShieldAlert,
    description: 'Chronological Azure security and network telemetry alerts',
  },
  {
    id: 'alerts',
    label: 'Alert Settings',
    path: '/alerts',
    icon: BellRing,
    description: 'Email alert severity trigger thresholds',
  },
  {
    id: 'reports',
    label: 'Reports & Export',
    path: '/reports',
    icon: FileSpreadsheet,
    description: 'Audit report generation and CSV/PDF export',
  },
  {
    id: 'resources',
    label: 'Azure Resources',
    path: '/resources',
    icon: FileCode,
    description: 'Azure resource inventory (backend integration pending)',
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: Settings,
    description: 'Preferences and API configurations',
  },
];
