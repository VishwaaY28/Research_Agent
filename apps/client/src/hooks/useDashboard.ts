/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';
import { API } from '../utils/constants';

export type DashboardStats = {
  total_workspaces: number;
  total_sections: number;
  total_prompts: number;
  total_generated_content: number;
};

export type RecentGeneratedContent = {
  id: number;
  title: string;
  content_preview: string;
  workspace_name: string;
  created_at: string;
  user_name: string;
  prompt_id: number;
  workspace_id: number;
};

export type DashboardData = {
  stats: DashboardStats;
  recent_generated_content: RecentGeneratedContent[];
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
