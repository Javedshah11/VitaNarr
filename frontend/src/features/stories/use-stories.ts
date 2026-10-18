'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';

import { listStories } from './story-api';
import type { Story } from './story-types';

export function useStories() {
  const { authenticatedRequest, status } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStories = useCallback(async () => {
    try {
      const result = await listStories(authenticatedRequest);
      setStories(result);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Could not load stories.',
      );
    } finally {
      setLoading(false);
    }
  }, [authenticatedRequest]);

  useEffect(() => {
    if (status === 'authenticated') void loadStories();
  }, [loadStories, status]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await loadStories();
  }, [loadStories]);

  return { stories, setStories, loading, error, refresh };
}
