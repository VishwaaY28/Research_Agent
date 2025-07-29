# ProposalCraft Frontend

A modern, professional frontend for the ProposalCraft application built with React, TypeScript, shadcn/ui, and Aceternity UI.

## Features

- 🎨 Modern UI with shadcn/ui and Aceternity UI components
- 🌙 Dark/Light mode support
- 📱 Fully responsive design
- ⚡ Fast and optimized with Vite
- 🔐 Authentication system
- 📊 Interactive dashboard with analytics
- 🎭 Smooth animations with Framer Motion
- 🎯 TypeScript for type safety

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Aceternity UI** - Advanced UI components
- **Framer Motion** - Animations
- **React Router** - Routing
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Axios** - HTTP client

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3001`

### Backend Connection

The frontend is configured to proxy API requests to the backend server running on `http://localhost:8000`. Make sure your backend server is running before starting the frontend.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── layout/         # Layout components
│   │   ├── auth/           # Authentication components
│   │   └── dashboard/      # Dashboard components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions
│   ├── pages/              # Page components
│   └── main.tsx            # Application entry point
├── public/                 # Static assets
└── package.json
```

## Key Features

### Authentication
- Secure login/register forms
- JWT token management
- Protected routes

### Dashboard
- Real-time statistics
- Recent activity feed
- Quick actions
- Responsive grid layout

### UI Components
- Modern design system
- Consistent styling
- Accessible components
- Smooth animations

## Customization

### Themes
The application supports both light and dark themes. You can customize the color scheme by modifying the CSS variables in `src/index.css`.

### Components
All UI components are built with shadcn/ui and can be easily customized. Check the `src/components/ui/` directory for component definitions.

### Animations
Framer Motion is used for animations. You can customize animations in individual components or create new animation variants.

## Deployment

1. Build the application:
```bash
npm run build
```

2. The built files will be in the `dist/` directory, ready for deployment to any static hosting service.

## Contributing

1. Follow the existing code style
2. Use TypeScript for all new components
3. Add proper error handling
4. Test your changes thoroughly
5. Update documentation as needed