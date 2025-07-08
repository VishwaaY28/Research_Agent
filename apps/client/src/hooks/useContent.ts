import { useCallback, useState } from 'react';
import { API } from '../utils/constants';

export type WorkspaceContent = {
  sections: Section[];
};

export type Section = {
  id: number;
  name: string;
  content: string;
  source: string;
  tags: { id: number; name: string }[];
};

export type Prompt = {
  id: number;
  title: string;
  content: string;
  created_at: string;
  tags: { id: number; name: string }[];
};

export type GeneratedContent = {
  id: number;
  content: string;
  prompt_id: number;
  prompt_title: string;
  created_at: string;
  tags: { id: number; name: string }[];
};

export type GeneratedContentDetails = {
  id: number;
  content: string;
  prompt: {
    id: number;
    title: string;
    content: string;
  };
  created_at: string;
  tags: { id: number; name: string }[];
  context_sections: { id: number; name: string; content: string }[];
};

export function useContent() {
  const baseUrl = API.BASE_URL();
  const [loading, setLoading] = useState(false);

  const getWorkspaceContent = useCallback(
    async (workspaceId: string | number): Promise<WorkspaceContent> => {
      setLoading(true);
      try {
        const response = await fetch(
          `${baseUrl}/api/workspaces${API.ENDPOINTS.WORKSPACES.CONTENT.WORKSPACE_CONTENT(workspaceId)}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch workspace content: ${response.statusText}`);
        }

        const data = await response.json();
        return data.content;
      } finally {
        setLoading(false);
      }
    },
    [baseUrl],
  );

  const generateContent = useCallback(
    async (
      workspaceId: string | number,
      prompt: string,
      sectionIds: number[] = [],
    ): Promise<string> => {
      setLoading(true);
      try {
        const response = await fetch(
          `${baseUrl}/api/workspaces${API.ENDPOINTS.WORKSPACES.CONTENT.GENERATE(workspaceId)}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
              prompt,
              section_ids: sectionIds,
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to generate content: ${response.statusText}`);
        }

        const data = await response.json();
        return data.generated_content;
      } finally {
        setLoading(false);
      }
    },
    [baseUrl],
  );

  const saveGeneratedContent = useCallback(
    async (
      workspaceId: string | number,
      prompt: string,
      content: string,
      sectionIds: number[] = [],
      tags: string[] = [],
    ): Promise<{ prompt_id: number; generated_content_id: number }> => {
      setLoading(true);
      try {
        const response = await fetch(
          `${baseUrl}/api/workspaces${API.ENDPOINTS.WORKSPACES.CONTENT.SAVE_GENERATED(workspaceId)}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
              prompt,
              content,
              section_ids: sectionIds,
              tags,
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to save generated content: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
      } finally {
        setLoading(false);
      }
    },
    [baseUrl],
  );

  const getWorkspacePrompts = useCallback(
    async (workspaceId: string | number): Promise<Prompt[]> => {
      setLoading(true);
      try {
        const response = await fetch(
          `${baseUrl}/api/workspaces${API.ENDPOINTS.WORKSPACES.CONTENT.PROMPTS.LIST(workspaceId)}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch prompts: ${response.statusText}`);
        }

        const data = await response.json();
        return data.prompts;
      } finally {
        setLoading(false);
      }
    },
    [baseUrl],
  );

  const filterPromptsByTags = useCallback(
    async (workspaceId: string | number, tags: string[]): Promise<Prompt[]> => {
      setLoading(true);
      try {
        const response = await fetch(
          `${baseUrl}/api/workspaces${API.ENDPOINTS.WORKSPACES.CONTENT.PROMPTS.FILTER(workspaceId)}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ tag_names: tags }),
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to filter prompts: ${response.statusText}`);
        }

        const data = await response.json();
        return data.prompts;
      } finally {
        setLoading(false);
      }
    },
    [baseUrl],
  );

  const getWorkspaceGeneratedContent = useCallback(
    async (workspaceId: string | number): Promise<GeneratedContent[]> => {
      setLoading(true);
      try {
        const response = await fetch(
          `${baseUrl}/api/workspaces${API.ENDPOINTS.WORKSPACES.CONTENT.GENERATED.LIST(workspaceId)}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch generated content: ${response.statusText}`);
        }

        const data = await response.json();
        return data.generated_content;
      } finally {
        setLoading(false);
      }
    },
    [baseUrl],
  );

  const getGeneratedContentDetails = useCallback(
    async (
      workspaceId: string | number,
      contentId: string | number,
    ): Promise<GeneratedContentDetails> => {
      setLoading(true);
      try {
        const response = await fetch(
          `${baseUrl}/api/workspaces${API.ENDPOINTS.WORKSPACES.CONTENT.GENERATED.BY_ID(workspaceId, contentId)}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch generated content details: ${response.statusText}`);
        }

        const data = await response.json();
        return data.generated_content;
      } finally {
        setLoading(false);
      }
    },
    [baseUrl],
  );

  const filterGeneratedContentByTags = useCallback(
    async (workspaceId: string | number, tags: string[]): Promise<GeneratedContent[]> => {
      setLoading(true);
      try {
        const response = await fetch(
          `${baseUrl}/api/workspaces${API.ENDPOINTS.WORKSPACES.CONTENT.GENERATED.FILTER(workspaceId)}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ tag_names: tags }),
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to filter generated content: ${response.statusText}`);
        }

        const data = await response.json();
        return data.generated_content;
      } finally {
        setLoading(false);
      }
    },
    [baseUrl],
  );

  const addPromptTag = useCallback(
    async (
      workspaceId: string | number,
      promptId: string | number,
      tagName: string,
    ): Promise<void> => {
      const response = await fetch(
        `${baseUrl}/api/workspaces${API.ENDPOINTS.WORKSPACES.CONTENT.PROMPTS.ADD_TAG(workspaceId, promptId)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ tag_name: tagName }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to add tag to prompt: ${response.statusText}`);
      }
    },
    [baseUrl],
  );

  const removePromptTag = useCallback(
    async (
      workspaceId: string | number,
      promptId: string | number,
      tagId: string | number,
    ): Promise<void> => {
      const response = await fetch(
        `${baseUrl}/api/workspaces${API.ENDPOINTS.WORKSPACES.CONTENT.PROMPTS.REMOVE_TAG(workspaceId, promptId, tagId)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to remove tag from prompt: ${response.statusText}`);
      }
    },
    [baseUrl],
  );

  const addGeneratedContentTag = useCallback(
    async (
      workspaceId: string | number,
      contentId: string | number,
      tagName: string,
    ): Promise<void> => {
      const response = await fetch(
        `${baseUrl}/api/workspaces${API.ENDPOINTS.WORKSPACES.CONTENT.GENERATED.ADD_TAG(workspaceId, contentId)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ tag_name: tagName }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to add tag to generated content: ${response.statusText}`);
      }
    },
    [baseUrl],
  );

  const removeGeneratedContentTag = useCallback(
    async (
      workspaceId: string | number,
      contentId: string | number,
      tagId: string | number,
    ): Promise<void> => {
      const response = await fetch(
        `${baseUrl}/api/workspaces${API.ENDPOINTS.WORKSPACES.CONTENT.GENERATED.REMOVE_TAG(workspaceId, contentId, tagId)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to remove tag from generated content: ${response.statusText}`);
      }
    },
    [baseUrl],
  );

  const deletePrompt = useCallback(
    async (workspaceId: string | number, promptId: string | number): Promise<void> => {
      const response = await fetch(
        `${baseUrl}/api/workspaces${API.ENDPOINTS.WORKSPACES.CONTENT.PROMPTS.DELETE(workspaceId, promptId)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to delete prompt: ${response.statusText}`);
      }
    },
    [baseUrl],
  );

  const deleteGeneratedContent = useCallback(
    async (workspaceId: string | number, contentId: string | number): Promise<void> => {
      const response = await fetch(
        `${baseUrl}/api/workspaces${API.ENDPOINTS.WORKSPACES.CONTENT.GENERATED.DELETE(workspaceId, contentId)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to delete generated content: ${response.statusText}`);
      }
    },
    [baseUrl],
  );

  return {
    loading,
    getWorkspaceContent,
    generateContent,
    saveGeneratedContent,
    getWorkspacePrompts,
    filterPromptsByTags,
    getWorkspaceGeneratedContent,
    getGeneratedContentDetails,
    filterGeneratedContentByTags,
    addPromptTag,
    removePromptTag,
    addGeneratedContentTag,
    removeGeneratedContentTag,
    deletePrompt,
    deleteGeneratedContent,
  };
}
