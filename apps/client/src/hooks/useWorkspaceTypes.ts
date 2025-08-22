// Utility to fetch workspace types (id, name) for use in WorkspaceView
import { useEffect, useState } from 'react';
import { API } from '../utils/constants';

export type WorkspaceType = { id: number; name: string };

export function useWorkspaceTypes() {
  const [workspaceTypes, setWorkspaceTypes] = useState<WorkspaceType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API.BASE_URL()}/api/prompt-templates/types`, {
      headers: {
        Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '',
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setWorkspaceTypes(data);
        else if (Array.isArray(data.workspace_types)) setWorkspaceTypes(data.workspace_types);
        else setWorkspaceTypes([]);
      })
      .catch(() => setWorkspaceTypes([]))
      .finally(() => setLoading(false));
  }, []);

  return { workspaceTypes, loading };
}
