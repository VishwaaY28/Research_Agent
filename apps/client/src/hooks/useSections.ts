import { useCallback, useState } from 'react';
import { API } from '../utils/constants';

export interface Section {
  id: number;
  name: string;
  content: string;
  tags: string[];
  source: string;
  content_source?: string | null;
}

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
      throw new Error('Invalid response format for sections');
    }
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
        throw new Error(`Failed to create sections: ${response.statusText}`);
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

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete section: ${response.statusText}`);
      }

      return await response.json();
    },
    [baseUrl],
  );

  return {
    sections,
    fetchSections,
    createSections,
    deleteSection,
  };
}
