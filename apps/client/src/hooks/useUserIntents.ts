import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { API } from '../utils/constants';

export interface UserIntent {
  id: number;
  name: string;
  is_default: boolean;
}

export function useUserIntents() {
  const [userIntents, setUserIntents] = useState<UserIntent[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchUserIntents(): Promise<UserIntent[]> {
    setLoading(true);
    try {
      const res = await fetch(
        API.BASE_URL() + API.ENDPOINTS.RESEARCH_SECTION_TEMPLATES.BASE_URL() + API.ENDPOINTS.RESEARCH_SECTION_TEMPLATES.INTENTS(),
        {
          headers: {
            Authorization: localStorage.getItem('token')
              ? `Bearer ${localStorage.getItem('token')}`
              : '',
          },
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch user intents');
      }

      const result = await res.json();
      return result;
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch user intents');
      throw error;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUserIntents().then(setUserIntents).catch(() => {
      // Error already handled in fetchUserIntents
    });
  }, []);

  return {
    userIntents,
    loading,
    refetch: fetchUserIntents,
  };
}
