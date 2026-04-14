import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppSelector } from '../hooks/redux';
import { useToast } from '../components/ui/toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog } from '../components/ui/dialog';
import { apiService } from '../services/api';
import { API_ENDPOINTS, buildEndpoint } from '../config/api';
import { Loader2, Plus, Pencil, Trash2, Shield } from 'lucide-react';

const RolesPermissions = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { success, error: showError } = useToast();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeRole, setActiveRole] = useState(null);
  const [selectedSlugs, setSelectedSlugs] = useState(new Set());
  const [savingPerms, setSavingPerms] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const isPrimary = Boolean(user?.is_primary_platform_admin);

  const normalizeList = (res) => {
    const payload = res?.data?.data;
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    return [];
  };

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [permRes, rolesRes] = await Promise.all([
        apiService.get(API_ENDPOINTS.roleManagement.permissions),
        apiService.get(API_ENDPOINTS.roleManagement.roles),
      ]);
      setPermissions(normalizeList(permRes));
      setRoles(normalizeList(rolesRes));
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to load roles and permissions');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (isPrimary) {
      loadAll();
    }
  }, [isPrimary, loadAll]);

  const permissionsByAudience = useMemo(() => {
    const groups = {};
    permissions.forEach((p) => {
      const a = p.audience || 'other';
      if (!groups[a]) groups[a] = [];
      groups[a].push(p);
    });
    return groups;
  }, [permissions]);

  const openPermEditor = async (role) => {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.roleManagement.role, { id: role.id });
      const res = await apiService.get(endpoint);
      const full = res.data.data;
      setActiveRole(full);
      const list = full.nav_permissions || full.navPermissions || [];
      setSelectedSlugs(new Set(list.map((x) => x.slug)));
      setPermDialogOpen(true);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to load role');
    }
  };

  const toggleSlug = (slug) => {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const savePermissions = async () => {
    if (!activeRole) return;
    try {
      setSavingPerms(true);
      const endpoint = buildEndpoint(API_ENDPOINTS.roleManagement.rolePermissions, { id: activeRole.id });
      await apiService.put(endpoint, { slugs: Array.from(selectedSlugs) });
      success('Permissions saved');
      setPermDialogOpen(false);
      setActiveRole(null);
      loadAll();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save permissions');
    } finally {
      setSavingPerms(false);
    }
  };

  const createRole = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      setCreating(true);
      await apiService.post(API_ENDPOINTS.roleManagement.roles, { title: newTitle.trim() });
      success('Role created');
      setCreateOpen(false);
      setNewTitle('');
      loadAll();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create role');
    } finally {
      setCreating(false);
    }
  };

  const deleteRole = async (role) => {
    if (!window.confirm(`Delete role "${role.title}"?`)) return;
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.roleManagement.role, { id: role.id });
      await apiService.delete(endpoint);
      success('Role deleted');
      loadAll();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete role');
    }
  };

  if (!isPrimary) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Roles & permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Only the primary platform administrator can manage roles and sidebar permissions. Assign the{' '}
              <span className="font-mono text-sm">Admin</span> role (id 1) or set your account&apos;s primary user type to
              Admin to use this screen.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roles & permissions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create custom roles and choose which sidebar areas they can access. Assign roles to users from User
            Management.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New role
        </Button>
      </div>

      {permissions.length === 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base">Permission catalog is empty</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              The database has no sidebar permission rows yet (or they failed to load). Until you seed them, the
              Permissions dialog will be blank and every role will show{' '}
              <span className="font-medium text-foreground">0</span> permissions.
            </p>
            <p className="font-medium text-foreground">On the server (SSH), from the Laravel project root, run:</p>
            <pre className="rounded-md bg-muted p-3 text-xs text-foreground overflow-x-auto whitespace-pre-wrap">
              php artisan migrate --force{'\n'}
              php artisan permissions:sync-nav
            </pre>
            <p className="text-xs">
              Alternatively: <code className="rounded bg-muted px-1">php artisan db:seed --class=NavPermissionsSeeder --force</code>
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => loadAll()}>
              Retry after seeding
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-3">Title</th>
                  <th className="p-3">Slug</th>
                  <th className="p-3">System</th>
                  <th className="p-3">Users</th>
                  <th className="p-3">Permissions</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id} className="border-b">
                    <td className="p-3 font-medium">{role.title}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{role.slug || '—'}</td>
                    <td className="p-3">{role.is_system ? 'Yes' : 'No'}</td>
                    <td className="p-3">{role.users_with_role_count ?? 0}</td>
                    <td className="p-3">{role.nav_permissions_count ?? 0}</td>
                    <td className="p-3 text-right space-x-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => openPermEditor(role)}>
                        <Pencil className="h-3 w-3 mr-1" />
                        Permissions
                      </Button>
                      {!role.is_system && (
                        <Button type="button" size="sm" variant="ghost" onClick={() => deleteRole(role)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create role">
        <form onSubmit={createRole} className="space-y-4">
          <div>
            <Label htmlFor="role_title">Role name</Label>
            <Input
              id="role_title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Finance sub-admin"
              className="mt-1"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        isOpen={permDialogOpen}
        onClose={() => {
          setPermDialogOpen(false);
          setActiveRole(null);
        }}
        title={activeRole ? `Permissions — ${activeRole.title}` : 'Permissions'}
        size="3xl"
      >
        {activeRole && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
            <p className="text-sm text-muted-foreground">
              System roles can be edited to match your policy. Users need the role assigned under User Management →
              roles.
            </p>
            {permissions.length === 0 ? (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-4 text-sm text-muted-foreground">
                No permission definitions loaded. Seed the server (see the yellow box on this page), then open this
                dialog again.
              </div>
            ) : (
              Object.entries(permissionsByAudience)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([audience, rows]) => (
                  <div key={audience}>
                    <h3 className="text-sm font-semibold capitalize mb-2 text-foreground">{audience}</h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {rows.map((p) => (
                        <label
                          key={p.id}
                          className="flex items-start gap-2 rounded-md border border-border/60 p-2 cursor-pointer hover:bg-muted/40"
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={selectedSlugs.has(p.slug)}
                            onChange={() => toggleSlug(p.slug)}
                          />
                          <span>
                            <span className="font-medium text-sm block">{p.label}</span>
                            <span className="text-xs text-muted-foreground font-mono">{p.slug}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
            )}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setPermDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={savePermissions} disabled={savingPerms}>
                {savingPerms ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default RolesPermissions;
