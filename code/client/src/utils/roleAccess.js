const rolePaths = {
  manager: [
    '/',
    '/profile',
    '/receivers',
    '/providers',
    '/services',
    '/appointments',
    '/payments',
    '/reviews',
    '/reports',
    '/visualizations',
    '/users',
    '/ai-assistant'
  ],
  provider: [
    '/',
    '/profile',
    '/services',
    '/appointments',
    '/payments',
    '/reviews'
  ],
  receiver: [
    '/',
    '/profile',
    '/services',
    '/appointments',
    '/payments',
    '/reviews',
    '/ai-support'
  ]
};

export function defaultPathForRole() {
  return '/';
}

function normalizePath(pathname = '/') {
  const clean = pathname.split('?')[0].replace(/\/+$/, '');
  return clean || '/';
}

export function isPathAllowedForRole(role, pathname = '/') {
  const clean = normalizePath(pathname);
  return (rolePaths[role] || []).some((allowedPath) => clean === allowedPath || clean.startsWith(`${allowedPath}/`));
}
