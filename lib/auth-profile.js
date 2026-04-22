export function normalizeRole(role) {
  return role === 'seller' ? 'seller' : 'buyer';
}

export function resolveRole(user, fallbackRole = 'buyer') {
  return normalizeRole(user?.user_metadata?.role || user?.app_metadata?.role || fallbackRole);
}

export async function persistRoleMetadata(supabase, user, role) {
  const normalizedRole = normalizeRole(role);

  if (!user || user.user_metadata?.role === normalizedRole) return;

  const { error } = await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      role: normalizedRole,
    },
  });

  if (error) {
    console.error('[auth] Failed to persist role in auth metadata:', error.message);
  }
}

export async function syncProfile(supabase, user, role) {
  if (!user) return;

  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || user.user_metadata?.name || '',
    role: normalizeRole(role),
  });

  if (error) {
    console.error('[auth] Profile sync failed:', error.message);
  }
}
