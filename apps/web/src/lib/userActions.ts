import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiPost } from './api';
import { useAuth } from './auth';

export function useFollow(kind: 'device' | 'rom', id?: string) {
  const user = useAuth((s) => s.user);
  const patchUser = useAuth((s) => s.patchUser);
  const qc = useQueryClient();
  const key = kind === 'device' ? 'followedDevices' : 'followedRoms';
  const active = !!(user && id && user[key].includes(id));

  const mutation = useMutation({
    mutationFn: () => (active ? apiDelete(`/${kind}s/${id}/follow`) : apiPost(`/${kind}s/${id}/follow`)),
    onSuccess: () => {
      if (!user || !id) return;
      patchUser({ [key]: active ? user[key].filter((x) => x !== id) : [...user[key], id] });
      void qc.invalidateQueries({ queryKey: ['following'] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
  return { active, toggle: () => mutation.mutate(), pending: mutation.isPending, error: mutation.error };
}

export function useBookmark(targetType: 'DEVICE' | 'ROM', id?: string) {
  const user = useAuth((s) => s.user);
  const patchUser = useAuth((s) => s.patchUser);
  const qc = useQueryClient();
  const active = !!(user && id && user.bookmarks.some((b) => b.targetId === id));

  const mutation = useMutation({
    mutationFn: () => (active ? apiDelete(`/users/bookmarks/${id}`) : apiPost('/users/bookmarks', { targetType, targetId: id })),
    onSuccess: () => {
      if (!user || !id) return;
      patchUser({
        bookmarks: active ? user.bookmarks.filter((b) => b.targetId !== id) : [...user.bookmarks, { targetType, targetId: id }],
      });
      void qc.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });
  return { active, toggle: () => mutation.mutate(), pending: mutation.isPending, error: mutation.error };
}
