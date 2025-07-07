import { useCallback } from 'react';
import { API } from '../utils/constants';

export type WorkspaceImage = {
  id: number;
  workspace_id: number;
  source_image: {
    id: number;
    path: string;
    page_number?: number;
    caption?: string;
    ocr_text?: string;
  };
  tags: string[];
};

export function useWorkspaceImages() {
  const baseUrl = API.BASE_URL();
  const workspacesBase = API.ENDPOINTS.WORKSPACES.BASE_URL();

  const getWorkspaceImages = useCallback(
    async (workspaceId: string | number): Promise<WorkspaceImage[]> => {
      const response = await fetch(
        `${baseUrl}${workspacesBase}${API.ENDPOINTS.WORKSPACES.IMAGES.LIST(workspaceId)}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch workspace images: ${response.statusText}`);
      }
      return await response.json();
    },
    [baseUrl, workspacesBase],
  );

  const addImageToWorkspace = useCallback(
    async (workspaceId: string | number, sourceImageId: string | number) => {
      const response = await fetch(
        `${baseUrl}${workspacesBase}${API.ENDPOINTS.WORKSPACES.IMAGES.ADD(workspaceId, sourceImageId)}`,
        { method: 'POST' },
      );
      if (!response.ok) {
        throw new Error(`Failed to add image to workspace: ${response.statusText}`);
      }
      return await response.json();
    },
    [baseUrl, workspacesBase],
  );

  const filterImagesByTags = useCallback(
    async (workspaceId: string | number, tags: string[]): Promise<WorkspaceImage[]> => {
      const response = await fetch(
        `${baseUrl}${workspacesBase}${API.ENDPOINTS.WORKSPACES.IMAGES.FILTER(workspaceId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tags),
        },
      );
      if (!response.ok) {
        throw new Error(`Failed to filter images: ${response.statusText}`);
      }
      return await response.json();
    },
    [baseUrl, workspacesBase],
  );

  const addTagToImage = useCallback(
    async (workspaceId: string | number, workspaceImageId: string | number, tagName: string) => {
      const response = await fetch(
        `${baseUrl}${workspacesBase}${API.ENDPOINTS.WORKSPACES.IMAGES.ADD_TAG(workspaceId, workspaceImageId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tagName),
        },
      );
      if (!response.ok) {
        throw new Error(`Failed to add tag to image: ${response.statusText}`);
      }
      return await response.json();
    },
    [baseUrl, workspacesBase],
  );

  const addTagsToImage = useCallback(
    async (workspaceId: string | number, workspaceImageId: string | number, tagNames: string[]) => {
      const response = await fetch(
        `${baseUrl}${workspacesBase}${API.ENDPOINTS.WORKSPACES.IMAGES.ADD_TAGS_BULK(workspaceId, workspaceImageId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tagNames),
        },
      );
      if (!response.ok) {
        throw new Error(`Failed to add tags to image: ${response.statusText}`);
      }
      return await response.json();
    },
    [baseUrl, workspacesBase],
  );

  const removeTagFromImage = useCallback(
    async (
      workspaceId: string | number,
      workspaceImageId: string | number,
      tagId: string | number,
    ) => {
      const response = await fetch(
        `${baseUrl}${workspacesBase}${API.ENDPOINTS.WORKSPACES.IMAGES.REMOVE_TAG(workspaceId, workspaceImageId, tagId)}`,
        { method: 'DELETE' },
      );
      if (!response.ok) {
        throw new Error(`Failed to remove tag from image: ${response.statusText}`);
      }
      return await response.json();
    },
    [baseUrl, workspacesBase],
  );

  const deleteImage = useCallback(
    async (workspaceId: string | number, workspaceImageId: string | number, hard = false) => {
      const endpoint = hard
        ? API.ENDPOINTS.WORKSPACES.IMAGES.DELETE_HARD(workspaceId, workspaceImageId)
        : API.ENDPOINTS.WORKSPACES.IMAGES.DELETE_SOFT(workspaceId, workspaceImageId);

      const response = await fetch(`${baseUrl}${workspacesBase}${endpoint}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(`Failed to delete image: ${response.statusText}`);
      }
      return await response.json();
    },
    [baseUrl, workspacesBase],
  );

  return {
    getWorkspaceImages,
    addImageToWorkspace,
    filterImagesByTags,
    addTagToImage,
    addTagsToImage,
    removeTagFromImage,
    deleteImage,
  };
}
