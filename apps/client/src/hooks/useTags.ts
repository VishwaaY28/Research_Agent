import { useCallback, useState } from 'react';
import { API } from '../utils/constants';

export interface Tag {
  id: number;
  name: string;
  usage_count: number;
}

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  const baseUrl = API.BASE_URL();

  const fetchAllSectionTags = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${baseUrl}${API.ENDPOINTS.TAGS.BASE_URL()}${API.ENDPOINTS.TAGS.SECTIONS()}`,
        {
          credentials: 'include',
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch tags');
      }

      const data = await response.json();
      setTags(data);
      return data;
    } catch (error) {
      console.error('Error fetching tags:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  const searchTags = useCallback(
    async (query: string, limit = 10) => {
      if (!query.trim()) return [];

      try {
        const response = await fetch(
          `${baseUrl}${API.ENDPOINTS.TAGS.BASE_URL()}${API.ENDPOINTS.TAGS.SECTIONS_SEARCH()}?query=${encodeURIComponent(query)}&limit=${limit}`,
          { credentials: 'include' },
        );

        if (!response.ok) {
          throw new Error('Failed to search tags');
        }

        return await response.json();
      } catch (error) {
        console.error('Error searching tags:', error);
        return [];
      }
    },
    [baseUrl],
  );

  const fetchUserSectionTags = useCallback(
    async (userId: number) => {
      setLoading(true);
      try {
        const response = await fetch(
          `${baseUrl}${API.ENDPOINTS.TAGS.BASE_URL()}${API.ENDPOINTS.TAGS.USER_SECTIONS(userId)}`,
          { credentials: 'include' },
        );

        if (!response.ok) {
          throw new Error('Failed to fetch user tags');
        }

        const data = await response.json();
        setTags(data);
        return data;
      } catch (error) {
        console.error('Error fetching user tags:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [baseUrl],
  );

  return {
    tags,
    loading,
    fetchAllSectionTags,
    searchTags,
    fetchUserSectionTags,
  };
}
