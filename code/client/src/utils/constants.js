import {
  BriefcaseBusiness,
  CalendarClock,
  CreditCard,
  FileSpreadsheet,
  LayoutDashboard,
  ShieldCheck,
  Star,
  Users,
  UserRoundCheck,
  UserRoundCog
} from 'lucide-react';

export const appointmentStatuses = ['pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled', 'no_show'];
export const paymentStatuses = ['unpaid', 'paid', 'failed', 'refunded', 'partially_refunded'];
export const providerStatuses = ['active', 'resting', 'inactive', 'suspended'];
export const reviewDirections = ['receiver_to_provider', 'provider_to_receiver'];

export const navItems = [
  {
    path: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    title: 'Operations Dashboard',
    subtitle: 'Monitor bookings, payments, providers, and service performance in one place.'
  },
  {
    path: '/receivers',
    label: 'Receivers',
    icon: Users,
    title: 'Receivers',
    subtitle: 'Manage customers, service addresses, and booking history.'
  },
  {
    path: '/providers',
    label: 'Providers',
    icon: UserRoundCheck,
    title: 'Providers',
    subtitle: 'Manage service professionals, availability, and hourly rates.'
  },
  {
    path: '/services',
    label: 'Services',
    icon: BriefcaseBusiness,
    title: 'Services',
    subtitle: 'Maintain the service catalog and provider coverage.'
  },
  {
    path: '/appointments',
    label: 'Appointments',
    icon: CalendarClock,
    title: 'Appointments',
    subtitle: 'Create, track, and manage home service appointments.'
  },
  {
    path: '/payments',
    label: 'Payments',
    icon: CreditCard,
    title: 'Payments',
    subtitle: 'Track payment status, commissions, and provider payouts.'
  },
  {
    path: '/reviews',
    label: 'Reviews',
    icon: Star,
    title: 'Reviews',
    subtitle: 'Review service quality from both customer and provider directions.'
  },
  {
    path: '/reports',
    label: 'Reports',
    icon: FileSpreadsheet,
    title: 'Reports',
    subtitle: 'Export operational data for Excel and Tableau analysis.'
  },
  {
    path: '/users',
    label: 'User Management',
    icon: UserRoundCog,
    title: 'User Management',
    subtitle: 'Create accounts and control login access for each role.'
  }
];

export const roleNavItems = {
  manager: navItems,
  provider: [
    navItems[0],
    { ...navItems[2], label: 'My Profile', path: '/profile', icon: ShieldCheck, title: 'My Profile', subtitle: 'Manage your provider account and contact details.' },
    { ...navItems[3], label: 'My Services' },
    { ...navItems[4], label: 'My Appointments' },
    { ...navItems[5], label: 'My Payments' },
    { ...navItems[6], label: 'My Reviews' }
  ],
  receiver: [
    navItems[0],
    { ...navItems[1], label: 'My Profile', path: '/profile', icon: ShieldCheck, title: 'My Profile', subtitle: 'Manage your receiver account and contact details.' },
    { ...navItems[3], label: 'Book Service' },
    { ...navItems[4], label: 'My Appointments' },
    { ...navItems[5], label: 'My Payments' },
    { ...navItems[6], label: 'My Reviews' }
  ]
};
