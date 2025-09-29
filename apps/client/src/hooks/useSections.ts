import { useCallback, useState } from 'react';
import { API } from '../utils/constants';

export type Section = {
  id: number;
  name: string;
  content: string;
  tags: string[];
  source: string;
  content_source?: string | null;
};

export function useSections() {
  const [sections, setSections] = useState<Section[]>([]);

  const fetchSections = async (workspaceId: string) => {
    const res = await fetch(
      API.BASE_URL() + API.ENDPOINTS.SECTIONS.BASE_URL() + API.ENDPOINTS.SECTIONS.LIST(workspaceId),
      { credentials: 'include' },
    );
    if (!res.ok) throw new Error('Failed to fetch sections');
    const data = await res.json();
    console.log('Fetched sections:', data);
    if (!Array.isArray(data)) {
      throw new Error('Expected array of sections');
    }
    setSections(data);
    return data;
  };

  const searchSections = useCallback(
    async (workspaceId: string, contentQuery?: string, nameQuery?: string, tags?: string[]) => {
      try {
        const response = await fetch(
          `${baseUrl}${API.ENDPOINTS.SECTIONS.BASE_URL()}${API.ENDPOINTS.SECTIONS.SEARCH(workspaceId)}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
              content_query: contentQuery,
              name_query: nameQuery,
              tags: tags,
            }),
          },
        );

        if (!response.ok) {
          throw new Error('Failed to search sections');
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error searching sections:', error);
        throw error;
      }
    },
    [],
  );

  const filterSectionsByTags = async (workspaceId: string, tags: string[]) => {
    const response = await fetch(
      `${API.BASE_URL()}${API.ENDPOINTS.SECTIONS.BASE_URL()}/filter/${workspaceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(tags),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to filter sections');
    }

    const data = await response.json();
    setSections(data);
    return data;
  };

  const baseUrl = API.BASE_URL();

  const createSections = useCallback(
    async (
      workspaceId: string | number,
      filename: string,
      chunks: Array<{ content: string; name?: string; tags?: string[] }>,
    ) => {
      const response = await fetch(
        API.BASE_URL() +
          API.ENDPOINTS.SECTIONS.BASE_URL() +
          API.ENDPOINTS.SECTIONS.BULK_CREATE(workspaceId) +
          `?filename=${encodeURIComponent(filename)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunks),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create sections');
      }

      return await response.json();
    },
    [baseUrl],
  );

  const deleteSection = useCallback(
    async (sectionId: string | number, hard = false) => {
      const endpoint = hard
        ? API.ENDPOINTS.SECTIONS.DELETE_HARD(sectionId)
        : API.ENDPOINTS.SECTIONS.DELETE_SOFT(sectionId);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${baseUrl}${API.ENDPOINTS.SECTIONS.BASE_URL()}${endpoint}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete section');
      }
    },
    [baseUrl],
  );

  return {
    sections,
    searchSections,
    fetchSections,
    filterSectionsByTags,
    createSections,
    deleteSection,
  };
}
