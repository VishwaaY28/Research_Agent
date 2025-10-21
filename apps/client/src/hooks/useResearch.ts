import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { API } from '../utils/constants';

export interface ResearchRequest {
  company_name: string;
  product_name: string;
  objective: string;
  sections: string[];
  custom_sections?: string[];
  urls?: string[];
  guiding_notes?: string;
}

export interface ResearchAgentRequest {
  company_name: string;
  product_name: string;
  selected_urls?: string[];
}

export interface URLFetchRequest {
  company_name: string;
  product_name: string;
}

export interface URLSelectionRequest {
  company_name: string;
  product_name: string;
  objective: string;
  sections: string[];
  custom_sections?: string[];
  selected_urls: string[];
  guiding_notes?: string;
}

export interface URLItem {
  URL: string;
  Description: string;
}

export interface URLFetchResponse {
  urls: URLItem[];
  status: string;
  message: string;
}

export interface ResearchResponse {
  workspace_id: number;
  research_id: string;
  status: string;
  message: string;
}

export interface ResearchSection {
  section_name: string;
  group: string;
  relevant: boolean;
  topic: string;
  content: Record<string, any>;
  notes: string;
}

export interface ResearchAgentResponse {
  urls: URLItem[];
  sections: ResearchSection[];
  error?: string;
}

export interface ResearchStatus {
  workspace_id: number;
  status: string;
  progress: number;
  sections_generated: number;
  last_updated: string;
}

export function useResearch() {
  const [loading, setLoading] = useState(false);

  async function startResearch(data: ResearchRequest): Promise<ResearchResponse> {
    setLoading(true);
    try {
      const res = await fetch(API.BASE_URL() + API.ENDPOINTS.RESEARCH.BASE_URL() + API.ENDPOINTS.RESEARCH.START(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: localStorage.getItem('token')
            ? `Bearer ${localStorage.getItem('token')}`
            : '',
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to start research workflow');
      }

      const result = await res.json();
      toast.success('Research workflow started successfully!');
      return result;
    } catch (error: any) {
      toast.error(error.message || 'Failed to start research workflow');
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function fetchURLs(data: URLFetchRequest): Promise<URLFetchResponse> {
    setLoading(true);
    try {
      const res = await fetch(API.BASE_URL() + API.ENDPOINTS.RESEARCH.BASE_URL() + API.ENDPOINTS.RESEARCH.FETCH_URLS(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: localStorage.getItem('token')
            ? `Bearer ${localStorage.getItem('token')}`
            : '',
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch URLs');
      }

      const result = await res.json();
      toast.success(`Found ${result.urls.length} relevant URLs!`);
      return result;
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch URLs');
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function startResearchWithURLs(data: URLSelectionRequest): Promise<ResearchResponse> {
    setLoading(true);
    try {
      const res = await fetch(API.BASE_URL() + API.ENDPOINTS.RESEARCH.BASE_URL() + API.ENDPOINTS.RESEARCH.START_WITH_URLS(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: localStorage.getItem('token')
            ? `Bearer ${localStorage.getItem('token')}`
            : '',
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to start research workflow');
      }

      const result = await res.json();
      toast.success('Research workflow started successfully!');
      return result;
    } catch (error: any) {
      toast.error(error.message || 'Failed to start research workflow');
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function getResearchStatus(workspaceId: string | number): Promise<ResearchStatus> {
    try {
      const res = await fetch(
        API.BASE_URL() + API.ENDPOINTS.RESEARCH.BASE_URL() + API.ENDPOINTS.RESEARCH.STATUS(workspaceId),
        {
          headers: {
            Authorization: localStorage.getItem('token')
              ? `Bearer ${localStorage.getItem('token')}`
              : '',
          },
        }
      );

      if (!res.ok) {
        throw new Error('Failed to get research status');
      }

      return await res.json();
    } catch (error: any) {
      console.error('Failed to get research status:', error);
      throw error;
    }
  }

  async function runResearchAgent(data: ResearchAgentRequest): Promise<ResearchAgentResponse> {
    setLoading(true);
    try {
      const res = await fetch(API.BASE_URL() + API.ENDPOINTS.RESEARCH_AGENT.BASE_URL() + API.ENDPOINTS.RESEARCH_AGENT.RUN(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: localStorage.getItem('token')
            ? `Bearer ${localStorage.getItem('token')}`
            : '',
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to run research agent');
      }

      const result = await res.json();
      toast.success('Research agent completed successfully!');
      return result;
    } catch (error: any) {
      toast.error(error.message || 'Failed to run research agent');
      throw error;
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    startResearch,
    fetchURLs,
    startResearchWithURLs,
    getResearchStatus,
    runResearchAgent,
  };
}
