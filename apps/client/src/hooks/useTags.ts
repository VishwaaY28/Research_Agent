import { useCallback, useState } from 'react';
import { API } from '../utils/constants';

export type Tag = {
  id: number;
  name: string;
  usage_count: number;
};

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [imageTags, setImageTags] = useState<Tag[]>([]);
  const [tableTags, setTableTags] = useState<Tag[]>([]);
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

  const fetchAllImageTags = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${baseUrl}${API.ENDPOINTS.TAGS.BASE_URL()}${API.ENDPOINTS.TAGS.IMAGES()}`,
        {
          credentials: 'include',
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch image tags');
      }

      const data = await response.json();
      setImageTags(data);
      return data;
    } catch (error) {
      console.error('Error fetching image tags:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  const searchImageTags = useCallback(
    async (query: string, limit = 10) => {
      if (!query.trim()) return [];

      try {
        const response = await fetch(
          `${baseUrl}${API.ENDPOINTS.TAGS.BASE_URL()}${API.ENDPOINTS.TAGS.IMAGES_SEARCH()}?query=${encodeURIComponent(query)}&limit=${limit}`,
          { credentials: 'include' },
        );

        if (!response.ok) {
          throw new Error('Failed to search image tags');
        }

        return await response.json();
      } catch (error) {
        console.error('Error searching image tags:', error);
        return [];
      }
    },
    [baseUrl],
  );

  const fetchAllTableTags = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${baseUrl}${API.ENDPOINTS.TAGS.BASE_URL()}${API.ENDPOINTS.TAGS.TABLES()}`,
        {
          credentials: 'include',
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch table tags');
      }

      const data = await response.json();
      setTableTags(data);
      return data;
    } catch (error) {
      console.error('Error fetching table tags:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  const searchTableTags = useCallback(
    async (query: string, limit = 10) => {
      if (!query.trim()) return [];

      try {
        const response = await fetch(
          `${baseUrl}${API.ENDPOINTS.TAGS.BASE_URL()}${API.ENDPOINTS.TAGS.TABLES_SEARCH()}?query=${encodeURIComponent(query)}&limit=${limit}`,
          { credentials: 'include' },
        );

        if (!response.ok) {
          throw new Error('Failed to search table tags');
        }

        return await response.json();
      } catch (error) {
        console.error('Error searching table tags:', error);
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
    imageTags,
    tableTags,
    loading,
    fetchAllSectionTags,
    searchTags,
    fetchAllImageTags,
    searchImageTags,
    fetchAllTableTags,
    searchTableTags,
    fetchUserSectionTags,
  };
}
