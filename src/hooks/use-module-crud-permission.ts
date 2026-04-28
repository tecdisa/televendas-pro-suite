import { useEffect, useMemo, useState } from 'react';
import { authService } from '@/services/authService';
import { usersService, type UsuarioPermissao } from '@/services/usersService';

type CrudPermissionState = {
  canSelect: boolean;
  canInsert: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  loading: boolean;
};

const PERMISSIONS_CACHE = new Map<string, UsuarioPermissao[]>();
const PERMISSIONS_INFLIGHT = new Map<string, Promise<UsuarioPermissao[]>>();

const EMPTY_PERMISSION_STATE: Omit<CrudPermissionState, 'loading'> = {
  canSelect: false,
  canInsert: false,
  canUpdate: false,
  canDelete: false,
};

const FULL_PERMISSION_STATE: Omit<CrudPermissionState, 'loading'> = {
  canSelect: true,
  canInsert: true,
  canUpdate: true,
  canDelete: true,
};

const normalizeFuncaoKey = (value: string | null | undefined) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const buildPermissionCacheKey = () => {
  const session = authService.getSession();
  const empresa = authService.getEmpresa();
  const userId = Number(session?.userId ?? 0);
  const empresaId = Number(empresa?.empresa_id ?? 0);

  if (!Number.isInteger(userId) || userId <= 0) return null;
  if (!Number.isInteger(empresaId) || empresaId <= 0) return null;
  return `${userId}:${empresaId}`;
};

const getPermissionsCached = async (cacheKey: string) => {
  const cached = PERMISSIONS_CACHE.get(cacheKey);
  if (cached) return cached;

  const inflight = PERMISSIONS_INFLIGHT.get(cacheKey);
  if (inflight) return inflight;

  const request = usersService
    .getMyPermissions()
    .then((rows) => {
      PERMISSIONS_CACHE.set(cacheKey, rows);
      return rows;
    })
    .finally(() => {
      PERMISSIONS_INFLIGHT.delete(cacheKey);
    });

  PERMISSIONS_INFLIGHT.set(cacheKey, request);
  return request;
};

export function useModuleCrudPermission(funcao: string): CrudPermissionState {
  const cacheKey = buildPermissionCacheKey();
  const isPrivilegedUser = authService.isAdmin() || authService.isMasterAdmin();

  const [permissions, setPermissions] = useState<UsuarioPermissao[]>(() => {
    if (!cacheKey) return [];
    return PERMISSIONS_CACHE.get(cacheKey) ?? [];
  });
  const [loading, setLoading] = useState(
    !isPrivilegedUser && Boolean(cacheKey) && !PERMISSIONS_CACHE.has(String(cacheKey)),
  );

  useEffect(() => {
    if (isPrivilegedUser) {
      setLoading(false);
      return;
    }

    if (!cacheKey) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    const cached = PERMISSIONS_CACHE.get(cacheKey);
    if (cached) {
      setPermissions(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setPermissions([]);
    setLoading(true);

    getPermissionsCached(cacheKey)
      .then((rows) => {
        if (!cancelled) {
          setPermissions(rows);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPermissions([]);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, isPrivilegedUser]);

  const permissionByFuncao = useMemo(
    () =>
      new Map(
        permissions.map((item) => [normalizeFuncaoKey(item.funcao), item]),
      ),
    [permissions],
  );

  if (isPrivilegedUser) {
    return { ...FULL_PERMISSION_STATE, loading: false };
  }

  const modulePermission = permissionByFuncao.get(normalizeFuncaoKey(funcao));
  if (!modulePermission) {
    return { ...EMPTY_PERMISSION_STATE, loading };
  }

  return {
    canSelect: Boolean(modulePermission.can_select),
    canInsert: Boolean(modulePermission.can_insert),
    canUpdate: Boolean(modulePermission.can_update),
    canDelete: Boolean(modulePermission.can_delete),
    loading,
  };
}
