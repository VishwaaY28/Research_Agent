// import { useCallback } from 'react';
// import { API } from '../utils/constants';

// export type WorkspaceTable = {
//   id: number;
//   workspace_id: number;
//   source_table: {
//     id: number;
//     path: string;
//     page_number?: number;
//     caption?: string;
//     data?: string;
//     extraction_method?: string;
//   };
//   tags: string[];
// };

// export function useWorkspaceTables() {
//   const baseUrl = API.BASE_URL();
//   const workspacesBase = API.ENDPOINTS.WORKSPACES.BASE_URL();

//   const getWorkspaceTables = useCallback(
//     async (workspaceId: string | number): Promise<WorkspaceTable[]> => {
//       const response = await fetch(
//         `${baseUrl}${workspacesBase}${API.ENDPOINTS.WORKSPACES.TABLES.LIST(workspaceId)}`,
//       );
//       if (!response.ok) {
//         throw new Error(`Failed to fetch workspace tables: ${response.statusText}`);
//       }
//       return await response.json();
//     },
//     [baseUrl, workspacesBase],
//   );

//   const addTableToWorkspace = useCallback(
//     async (workspaceId: string | number, sourceTableId: string | number) => {
//       const response = await fetch(
//         `${baseUrl}${workspacesBase}${API.ENDPOINTS.WORKSPACES.TABLES.ADD(workspaceId, sourceTableId)}`,
//         { method: 'POST' },
//       );
//       if (!response.ok) {
//         throw new Error(`Failed to add table to workspace: ${response.statusText}`);
//       }
//       return await response.json();
//     },
//     [baseUrl, workspacesBase],
//   );

//   const filterTablesByTags = useCallback(
//     async (workspaceId: string | number, tags: string[]): Promise<WorkspaceTable[]> => {
//       const response = await fetch(
//         `${baseUrl}${workspacesBase}${API.ENDPOINTS.WORKSPACES.TABLES.FILTER(workspaceId)}`,
//         {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify(tags),
//         },
//       );
//       if (!response.ok) {
//         throw new Error(`Failed to filter tables: ${response.statusText}`);
//       }
//       return await response.json();
//     },
//     [baseUrl, workspacesBase],
//   );

//   const addTagToTable = useCallback(
//     async (workspaceId: string | number, workspaceTableId: string | number, tagName: string) => {
//       const response = await fetch(
//         `${baseUrl}${workspacesBase}${API.ENDPOINTS.WORKSPACES.TABLES.ADD_TAG(workspaceId, workspaceTableId)}`,
//         {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify(tagName),
//         },
//       );
//       if (!response.ok) {
//         throw new Error(`Failed to add tag to table: ${response.statusText}`);
//       }
//       return await response.json();
//     },
//     [baseUrl, workspacesBase],
//   );

//   const addTagsToTable = useCallback(
//     async (workspaceId: string | number, workspaceTableId: string | number, tagNames: string[]) => {
//       const response = await fetch(
//         `${baseUrl}${workspacesBase}${API.ENDPOINTS.WORKSPACES.TABLES.ADD_TAGS_BULK(workspaceId, workspaceTableId)}`,
//         {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify(tagNames),
//         },
//       );
//       if (!response.ok) {
//         throw new Error(`Failed to add tags to table: ${response.statusText}`);
//       }
//       return await response.json();
//     },
//     [baseUrl, workspacesBase],
//   );

//   const removeTagFromTable = useCallback(
//     async (
//       workspaceId: string | number,
//       workspaceTableId: string | number,
//       tagId: string | number,
//     ) => {
//       const response = await fetch(
//         `${baseUrl}${workspacesBase}${API.ENDPOINTS.WORKSPACES.TABLES.REMOVE_TAG(workspaceId, workspaceTableId, tagId)}`,
//         { method: 'DELETE' },
//       );
//       if (!response.ok) {
//         throw new Error(`Failed to remove tag from table: ${response.statusText}`);
//       }
//       return await response.json();
//     },
//     [baseUrl, workspacesBase],
//   );

//   const deleteTable = useCallback(
//     async (workspaceId: string | number, workspaceTableId: string | number, hard = false) => {
//       const endpoint = hard
//         ? API.ENDPOINTS.WORKSPACES.TABLES.DELETE_HARD(workspaceId, workspaceTableId)
//         : API.ENDPOINTS.WORKSPACES.TABLES.DELETE_SOFT(workspaceId, workspaceTableId);

//       const response = await fetch(`${baseUrl}${workspacesBase}${endpoint}`, { method: 'DELETE' });
//       if (!response.ok) {
//         throw new Error(`Failed to delete table: ${response.statusText}`);
//       }
//       return await response.json();
//     },
//     [baseUrl, workspacesBase],
//   );

//   return {
//     getWorkspaceTables,
//     addTableToWorkspace,
//     filterTablesByTags,
//     addTagToTable,
//     addTagsToTable,
//     removeTagFromTable,
//     deleteTable,
//   };
// }
