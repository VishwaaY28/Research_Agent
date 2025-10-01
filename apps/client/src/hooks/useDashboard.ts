/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useState } from 'react';
import { API } from '../utils/constants';

export type DashboardStats = {
  total_workspaces: number;
  total_sections: number;
  total_prompts: number;
  total_generated_content: number;
};

export type RecentWorkspace = {
  id: number;
  name: string;
  client: string;
  last_used_at: string | null;
};

export type PromptTemplate = {
  id: number;
  name: string;
  last_used_at: string | null;
};

export type DashboardData = {
  stats: DashboardStats;
  recent_workspaces: RecentWorkspace[];
  recent_prompts: PromptTemplate[];
};

export function useDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API.BASE_URL()}${API.ENDPOINTS.DATA.BASE_URL()}${API.ENDPOINTS.DATA.DASHBOARD()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const result = await response.json();

      if (result.success) {
        setDashboardData(result.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    dashboardData,
    loading,
    error,
    fetchDashboardData,
  };
}
