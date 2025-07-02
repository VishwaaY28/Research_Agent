import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Home from './pages/Home';
import Error from './pages/Error';
import Auth from './pages/Auth';
import DashLayout from './layouts/DashLayout';
import DashHome from './pages/dashboard/Home';
import Workspaces from './pages/dashboard/Workspaces';
import ContentIngestion from './pages/dashboard/ContentIngestion';
import ProposalAuthoring from './pages/dashboard/ProposalAuthoring';
import ProposalGrid from './pages/dashboard/ProposalGrid';
import CreateProposal from './pages/dashboard/CreateProposal';
import ProposalView from './pages/dashboard/ProposalView';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
    errorElement: <Error />,
  },
  {
    path: '/auth',
    element: <Auth />,
    errorElement: <Error />,
  },
  {
    path: '/dashboard',
    element: <DashLayout />,
    errorElement: <Error />,
    children: [
      {
        index: true,
        element: <DashHome />,
        errorElement: <Error />,
      },
      {
        path: 'workspaces',
        element: <Workspaces />,
        errorElement: <Error />,
      },
      {
        path: 'content-ingestion',
        element: <ContentIngestion />,
        errorElement: <Error />,
      },
      {
        path: 'proposal-authoring',
        element: <ProposalGrid />,
        errorElement: <Error />,
      },
      {
        path: 'proposal-authoring/create-proposal',
        element: <CreateProposal />,
        errorElement: <Error />,
      },
      {
        path: 'proposal-authoring/:id',
        element: <ProposalView />,
        errorElement: <Error />,
      },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
