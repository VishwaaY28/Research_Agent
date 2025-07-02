import { useState } from 'react';

export type Workspace = {
  id: string;
  name: string;
  clientName?: string;
  tags: string[];
  createdAt: string;
};

export type ContentChunk = {
  id: string;
  text: string;
  tag: string;
  createdAt: string;
};

const dummyWorkspaces: Workspace[] = [
  {
    id: 'w1',
    name: 'Acme Corp Marketing Strategy',
    clientName: 'Acme Corporation',
    tags: ['marketing', 'strategy', '2025'],
    createdAt: '2025-06-15',
  },
  {
    id: 'w2',
    name: 'University Research Partnership',
    clientName: 'Stanford University',
    tags: ['research', 'collaboration'],
    createdAt: '2025-06-18',
  },
  {
    id: 'w3',
    name: 'DevOps Implementation',
    clientName: 'TechStart Inc.',
    tags: ['devops', 'automation'],
    createdAt: '2025-06-20',
  },
];

const dummyChunks: Record<string, ContentChunk[]> = {
  w1: [
    {
      id: 'c1',
      text: 'Q4 marketing plan for Acme Corporation focusing on digital transformation and customer engagement strategies. This comprehensive approach will leverage data analytics and automation tools to enhance campaign effectiveness.',
      tag: 'marketing',
      createdAt: '2025-06-20',
    },
    {
      id: 'c2',
      text: 'Digital strategy outline encompassing social media presence, content marketing, and SEO optimization. Key performance indicators will include engagement rates, conversion metrics, and brand awareness measurements.',
      tag: 'strategy',
      createdAt: '2025-06-21',
    },
    {
      id: 'c3',
      text: '2025 campaign goals include 30% increase in lead generation, 25% improvement in customer retention, and expansion into three new market segments through targeted advertising and strategic partnerships.',
      tag: '2025',
      createdAt: '2025-06-22',
    },
  ],
  w2: [
    {
      id: 'c4',
      text: 'Research proposal draft for collaborative study on artificial intelligence applications in healthcare. The project aims to develop innovative solutions for early disease detection and personalized treatment plans.',
      tag: 'research',
      createdAt: '2025-06-25',
    },
    {
      id: 'c5',
      text: 'Partner university list includes Stanford, MIT, Harvard, and UC Berkeley. Each institution brings unique expertise in machine learning, medical research, and data science to support the collaborative effort.',
      tag: 'collaboration',
      createdAt: '2025-06-26',
    },
  ],
  w3: [
    {
      id: 'c6',
      text: 'CI/CD pipeline notes covering automated testing, deployment strategies, and monitoring systems. Implementation includes Docker containers, Kubernetes orchestration, and comprehensive logging solutions.',
      tag: 'devops',
      createdAt: '2025-06-28',
    },
    {
      id: 'c7',
      text: 'Automation scripts for infrastructure provisioning, database migrations, and security compliance checks. Tools include Terraform, Ansible, and custom Python scripts for workflow optimization.',
      tag: 'automation',
      createdAt: '2025-06-29',
    },
  ],
};

export function useWorkspace() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(dummyWorkspaces);

  function getWorkspaceById(id: string) {
    return workspaces.find((w) => w.id === id);
  }

  function getChunksByWorkspaceId(id: string) {
    return dummyChunks[id] || [];
  }

  function getAllTags() {
    const tags = new Set<string>();
    workspaces.forEach((w) => w.tags.forEach((t) => tags.add(t)));
    return Array.from(tags);
  }

  function createWorkspace(data: { name: string; clientName: string; tags: string[] }) {
    const newWorkspace: Workspace = {
      id: `w${Date.now()}`,
      name: data.name,
      clientName: data.clientName,
      tags: data.tags,
      createdAt: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
    };

    setWorkspaces((prev) => [...prev, newWorkspace]);

    dummyChunks[newWorkspace.id] = [];

    return newWorkspace;
  }

  function updateWorkspace(id: string, data: Partial<Workspace>) {
    setWorkspaces((prev) =>
      prev.map((workspace) => (workspace.id === id ? { ...workspace, ...data } : workspace)),
    );
  }

  function deleteWorkspace(id: string) {
    setWorkspaces((prev) => prev.filter((workspace) => workspace.id !== id));
    delete dummyChunks[id];
  }

  return {
    workspaces,
    getWorkspaceById,
    getChunksByWorkspaceId,
    getAllTags,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
  };
}
