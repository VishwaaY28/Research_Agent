export const API = {
  BASE_URL: () => import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:8000/api',
  ENDPOINTS: {
    AUTH: {
      BASE_URL: () => '/auth',
      REGISTER: () => '/register',
      LOGIN: () => '/login',
      SESSION: () => '/session',
    },
    WORKSPACES: {
      BASE_URL: () => '/workspaces',
      BY_ID: (id: string | number) => `/${id}`,
      BY_NAME: (name: string) => `/by-name/${encodeURIComponent(name)}`,
      FILTER: () => '/filter?',
      UPDATE: (id: string | number) => `/${id}`,
      DELETE_SOFT: (id: string | number) => `/soft/${id}`,
      DELETE_HARD: (id: string | number) => `/hard/${id}`,
    },
    SECTIONS: {
      BASE_URL: () => '/sections',
      LIST: (workspaceId: string | number) => `/list/${workspaceId}`,
      BULK_CREATE: (workspaceId: string | number) => `/bulk/${workspaceId}`,
      DELETE_SOFT: (sectionId: string | number) => `/soft/${sectionId}`,
      DELETE_HARD: (sectionId: string | number) => `/hard/${sectionId}`,
    },
    SOURCES: {
      BASE_URL: () => '/sources',
      UPLOAD: (workspaceId: string | number) => `/${workspaceId}`,
      LIST: (workspaceId: string | number) => `/list/${workspaceId}`,
      FILTER: (workspaceId: string | number) => `/list/filter/${workspaceId}`,
      DELETE_SOFT: (contentSourceId: string | number) => `/soft/${contentSourceId}`,
      DELETE_HARD: (contentSourceId: string | number) => `/hard/${contentSourceId}`,
    },
    TAGS: {
      BASE_URL: () => '/tags',
      SECTIONS: () => '/sections',
      SECTIONS_SEARCH: () => '/sections/search',
      USER_SECTIONS: (userId: string | number) => `/sections/user/${userId}`,
    },
  },
};
