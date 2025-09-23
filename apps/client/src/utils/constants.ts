export const API = {
  BASE_URL: () => '',
  ENDPOINTS: {
    AUTH: {
      BASE_URL: () => '/api/auth',
      REGISTER: () => '/register',
      LOGIN: () => '/login',
      SESSION: () => '/session',
    },
    DATA: {
      BASE_URL: () => '/api/data',
      DASHBOARD: () => '/dashboard',
    },
    WORKSPACES: {
      BASE_URL: () => '/api/workspaces',
      CREATE: () => '',
      LIST: () => '',
      BY_ID: (id: string | number) => `/${id}`,
      BY_NAME: (name: string) => `/by-name/${encodeURIComponent(name)}`,
      FILTER: () => '/filter',
      SEARCH: () => '/search',
      UPDATE: (id: string | number) => `/${id}`,
      DELETE_SOFT: (id: string | number) => `/soft/${id}`,
      DELETE_HARD: (id: string | number) => `/hard/${id}`,
      TYPES: () => '/types',
      // IMAGES: {
      //   LIST: (workspaceId: string | number) => `/${workspaceId}/images`,
      //   ADD: (workspaceId: string | number, sourceImageId: string | number) =>
      //     `/${workspaceId}/images/${sourceImageId}`,
      //   FILTER: (workspaceId: string | number) => `/${workspaceId}/images/filter`,
      //   ADD_TAG: (workspaceId: string | number, workspaceImageId: string | number) =>
      //     `/${workspaceId}/images/${workspaceImageId}/tags`,
      //   ADD_TAGS_BULK: (workspaceId: string | number, workspaceImageId: string | number) =>
      //     `/${workspaceId}/images/${workspaceImageId}/tags/bulk`,
      //   REMOVE_TAG: (
      //     workspaceId: string | number,
      //     workspaceImageId: string | number,
      //     tagId: string | number,
      //   ) => `/${workspaceId}/images/${workspaceImageId}/tags/${tagId}`,
      //   DELETE_SOFT: (workspaceId: string | number, workspaceImageId: string | number) =>
      //     `/${workspaceId}/images/${workspaceImageId}/soft`,
      //   DELETE_HARD: (workspaceId: string | number, workspaceImageId: string | number) =>
      //     `/${workspaceId}/images/${workspaceImageId}/hard`,
      // },
      // TABLES: {
      //   LIST: (workspaceId: string | number) => `/${workspaceId}/tables`,
      //   ADD: (workspaceId: string | number, sourceTableId: string | number) =>
      //     `/${workspaceId}/tables/${sourceTableId}`,
      //   FILTER: (workspaceId: string | number) => `/${workspaceId}/tables/filter`,
      //   ADD_TAG: (workspaceId: string | number, workspaceTableId: string | number) =>
      //     `/${workspaceId}/tables/${workspaceTableId}/tags`,
      //   ADD_TAGS_BULK: (workspaceId: string | number, workspaceTableId: string | number) =>
      //     `/${workspaceId}/tables/${workspaceTableId}/tags/bulk`,
      //   REMOVE_TAG: (
      //     workspaceId: string | number,
      //     workspaceTableId: string | number,
      //     tagId: string | number,
      //   ) => `/${workspaceId}/tables/${workspaceTableId}/tags/${tagId}`,
      //   DELETE_SOFT: (workspaceId: string | number, workspaceTableId: string | number) =>
      //     `/${workspaceId}/tables/${workspaceTableId}/soft`,
      //   DELETE_HARD: (workspaceId: string | number, workspaceTableId: string | number) =>
      //     `/${workspaceId}/tables/${workspaceTableId}/hard`,
      // },
      CONTENT: {
        WORKSPACE_CONTENT: (workspaceId: string | number) =>
          `/${workspaceId}/content/workspace-content`,
        GENERATE: (workspaceId: string | number) => `/${workspaceId}/content/generate`,
        SAVE_GENERATED: (workspaceId: string | number) => `/${workspaceId}/content/save-generated`,
        PROMPTS: {
          LIST: (workspaceId: string | number) => `/${workspaceId}/content/prompts`,
          CREATE: (workspaceId: string | number) => `/${workspaceId}/content/prompts`,
          FILTER: (workspaceId: string | number) => `/${workspaceId}/content/prompts/filter`,
          ADD_TAG: (workspaceId: string | number, promptId: string | number) =>
            `/${workspaceId}/content/prompts/${promptId}/tags`,
          REMOVE_TAG: (
            workspaceId: string | number,
            promptId: string | number,
            tagId: string | number,
          ) => `/${workspaceId}/content/prompts/${promptId}/tags/${tagId}`,
          DELETE: (workspaceId: string | number, promptId: string | number) =>
            `/${workspaceId}/content/prompts/${promptId}`,
        },
        GENERATED: {
          LIST: (workspaceId: string | number) => `/${workspaceId}/content/generated`,
          BY_ID: (workspaceId: string | number, contentId: string | number) =>
            `/${workspaceId}/content/generated/${contentId}`,
          FILTER: (workspaceId: string | number) => `/${workspaceId}/content/generated/filter`,
          ADD_TAG: (workspaceId: string | number, contentId: string | number) =>
            `/${workspaceId}/content/generated/${contentId}/tags`,
          REMOVE_TAG: (
            workspaceId: string | number,
            contentId: string | number,
            tagId: string | number,
          ) => `/${workspaceId}/content/generated/${contentId}/tags/${tagId}`,
          DELETE: (workspaceId: string | number, contentId: string | number) =>
            `/${workspaceId}/content/generated/${contentId}`,
        },
      },
    },
    SECTIONS: {
      BASE_URL: () => '/api/sections',
      LIST: (workspaceId: string | number) => `/list/${workspaceId}`,
      BULK_CREATE: (workspaceId: string | number) => `/bulk/${workspaceId}`,
      FILTER: (workspaceId: string | number) => `/filter/${workspaceId}`,
      SEARCH: (workspaceId: string | number) => `/search/${workspaceId}`,
      DELETE_SOFT: (sectionId: string | number) => `/soft/${sectionId}`,
      DELETE_HARD: (sectionId: string | number) => `/hard/${sectionId}`,
    },
    SOURCES: {
      BASE_URL: () => '/api/sources',
      LIST: () => '/list',
      BY_ID: (contentSourceId: string | number) => `/${contentSourceId}`,
      CHUNKS: (contentSourceId: string | number) => `/${contentSourceId}/chunks`,
      DELETE_SOFT: (contentSourceId: string | number) => `/soft/${contentSourceId}`,
      DELETE_HARD: (contentSourceId: string | number) => `/hard/${contentSourceId}`,
    },
    TAGS: {
      BASE_URL: () => '/api/tags',
      SECTIONS: () => '/sections',
      SECTIONS_SEARCH: () => '/sections/search',
      USER_SECTIONS: (userId: string | number) => `/sections/user/${userId}`,
      // Commented out for future use - Image and Table tag endpoints
      // IMAGES: () => '/images',
      // IMAGES_SEARCH: () => '/images/search',
      // TABLES: () => '/tables',
      // TABLES_SEARCH: () => '/tables/search',
    },
  },
};
