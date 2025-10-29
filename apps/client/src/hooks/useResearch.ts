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
  user_intent_id?: number;
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
  final_report?: string;
  error?: string;
}

export interface StreamMessage {
  type: 'log' | 'step' | 'error' | 'result' | 'complete';
  message?: string;
  step?: number;
  data?: ResearchAgentResponse;
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
      const res = await fetch(
        API.BASE_URL() + API.ENDPOINTS.RESEARCH.BASE_URL() + API.ENDPOINTS.RESEARCH.START(),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('token')
              ? `Bearer ${localStorage.getItem('token')}`
              : '',
          },
          body: JSON.stringify(data),
        },
      );

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
      const res = await fetch(
        API.BASE_URL() + API.ENDPOINTS.RESEARCH.BASE_URL() + API.ENDPOINTS.RESEARCH.FETCH_URLS(),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('token')
              ? `Bearer ${localStorage.getItem('token')}`
              : '',
          },
          body: JSON.stringify(data),
        },
      );

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
      const res = await fetch(
        API.BASE_URL() +
          API.ENDPOINTS.RESEARCH.BASE_URL() +
          API.ENDPOINTS.RESEARCH.START_WITH_URLS(),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('token')
              ? `Bearer ${localStorage.getItem('token')}`
              : '',
          },
          body: JSON.stringify(data),
        },
      );

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
        API.BASE_URL() +
          API.ENDPOINTS.RESEARCH.BASE_URL() +
          API.ENDPOINTS.RESEARCH.STATUS(workspaceId),
        {
          headers: {
            Authorization: localStorage.getItem('token')
              ? `Bearer ${localStorage.getItem('token')}`
              : '',
          },
        },
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
      const res = await fetch(
        API.BASE_URL() +
          API.ENDPOINTS.RESEARCH_AGENT.BASE_URL() +
          API.ENDPOINTS.RESEARCH_AGENT.RUN(),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('token')
              ? `Bearer ${localStorage.getItem('token')}`
              : '',
          },
          body: JSON.stringify(data),
        },
      );

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

  async function runResearchAgentStream(
    data: ResearchAgentRequest,
    onMessage: (message: StreamMessage) => void,
    onComplete: (result: ResearchAgentResponse) => void,
    onError: (error: string) => void,
  ): Promise<() => void> {
    setLoading(true);

    const abortController = new AbortController();

    try {
      const response = await fetch(
        API.BASE_URL() +
          API.ENDPOINTS.RESEARCH_AGENT.BASE_URL() +
          API.ENDPOINTS.RESEARCH_AGENT.RUN_STREAM(),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('token')
              ? `Bearer ${localStorage.getItem('token')}`
              : '',
          },
          body: JSON.stringify(data),
          signal: abortController.signal,
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      const processStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              setLoading(false);
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.trim() === '') continue;

              if (line.startsWith('data: ')) {
                try {
                  const messageData = line.slice(6); // Remove 'data: ' prefix
                  const message: StreamMessage = JSON.parse(messageData);
                  onMessage(message);

                  if (message.type === 'result' && message.data) {
                    onComplete(message.data);
                  } else if (message.type === 'complete') {
                    setLoading(false);
                    toast.success('Research agent completed successfully!');
                    return;
                  } else if (message.type === 'error') {
                    setLoading(false);
                    onError(message.message || 'Unknown error occurred');
                    toast.error(message.message || 'Research agent failed');
                    return;
                  }
                } catch (parseError) {
                  console.error('Error parsing stream message:', parseError);
                }
              }
            }
          }
        } catch (streamError: any) {
          if (streamError.name !== 'AbortError') {
            console.error('Stream processing error:', streamError);
            setLoading(false);
            onError('Stream processing error occurred');
            toast.error('Stream processing error occurred');
          }
        } finally {
          reader.releaseLock();
        }
      };

      processStream();
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Fetch error:', error);
        setLoading(false);
        onError(error.message || 'Connection error occurred');
        toast.error(error.message || 'Connection error occurred');
      }
    }

    // Return cleanup function
    return () => {
      setLoading(false);
      abortController.abort();
    };
  }

  return {
    loading,
    startResearch,
    fetchURLs,
    startResearchWithURLs,
    getResearchStatus,
    runResearchAgent,
    runResearchAgentStream,
  };
}
