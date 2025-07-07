import { useCallback } from 'react';
import { API } from '../utils/constants';

export function useSources() {
  const baseUrl = API.BASE_URL();

  const uploadSources = useCallback(
    async ({ files, urls }: { files?: File[]; urls?: string[] }) => {
      const formData = new FormData();
      if (files && files.length > 0) {
        files.forEach((file) => formData.append('files', file));
      }
      if (urls && urls.length > 0) {
        urls.forEach((url) => formData.append('urls', url));
      }

      const response = await fetch(API.BASE_URL() + API.ENDPOINTS.SOURCES.BASE_URL(), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      return await response.json();
    },
    [baseUrl],
  );

  const listSources = useCallback(async () => {
    const response = await fetch(`${baseUrl}${API.ENDPOINTS.SOURCES.LIST()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to list sources: ${response.statusText}`);
    }

    return await response.json();
  }, [baseUrl]);

  const deleteSource = useCallback(
    async (contentSourceId: string | number, hard = false) => {
      const endpoint = hard
        ? API.ENDPOINTS.SOURCES.DELETE_HARD(contentSourceId)
        : API.ENDPOINTS.SOURCES.DELETE_SOFT(contentSourceId);

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete source: ${response.statusText}`);
      }

      return await response.json();
    },
    [baseUrl],
  );

  return { uploadSources, listSources, deleteSource };
}
