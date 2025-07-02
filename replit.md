# Whspr - Personalized Sleep Music & Affirmations

## Overview

Whspr is a full-stack web application that creates personalized sleep music and meditation tracks with AI-generated affirmations. The application uses modern web technologies including React, TypeScript, Express, and PostgreSQL to deliver a seamless user experience for generating custom audio content based on user mood and intentions.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: React Hook Form for forms, TanStack Query for server state
- **Routing**: Wouter for client-side navigation
- **Design System**: Dark theme with purple accents, glassmorphism UI elements
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Authentication**: Replit Auth with session-based authentication
- **API Design**: RESTful endpoints with JSON responses
- **Middleware**: CORS, body parsing, request logging, error handling

### Database Layer
- **Database**: PostgreSQL with Neon serverless
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema**: Shared schema definitions between client and server
- **Migrations**: Drizzle Kit for database schema management

## Key Components

### Authentication System
- **Provider**: Replit Auth integration for seamless user management
- **Session Management**: PostgreSQL-backed session storage with connect-pg-simple
- **User Model**: Standard user profiles with email, names, and profile images
- **Security**: HTTP-only cookies, secure session handling

### Track Generation System
- **AI Integration**: OpenAI GPT-4o for mood analysis and affirmation generation
- **Mood Analysis**: Extracts emotional tags from journal text input
- **Content Generation**: Creates personalized affirmations based on user context
- **Track Types**: Supports both meditation and sleep track generation

### Audio Player
- **Custom Implementation**: Built-in audio controls with Web Audio API
- **Features**: Play/pause, seeking, time display, volume control
- **Affirmation Display**: Rotates affirmations every 30 seconds during playback
- **Responsive Design**: Mobile-optimized player interface

### UI Components
- **Component Library**: shadcn/ui with Radix UI primitives
- **Custom Components**: Glassmorphism cards, mood tags, audio player
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Animations**: Smooth transitions and loading states

## Data Flow

1. **User Authentication**: Users authenticate via Replit Auth, sessions stored in PostgreSQL
2. **Track Creation**: Users fill out metadata form (title, description, journal prompt, duration)
3. **Mood Analysis**: Journal text sent to OpenAI API for mood tag extraction
4. **Affirmation Generation**: Combined metadata sent to OpenAI for personalized affirmations
5. **Track Storage**: Generated content saved to database with user association
6. **Playback**: Audio player loads track data and displays rotating affirmations

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database ORM with PostgreSQL dialect
- **openai**: Official OpenAI API client for GPT-4o integration
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Headless UI components for accessibility

### Development Tools
- **tsx**: TypeScript execution for development server
- **esbuild**: Fast bundling for production builds
- **tailwindcss**: Utility-first CSS framework
- **typescript**: Static type checking

### Authentication & Sessions
- **openid-client**: OpenID Connect client for Replit Auth
- **passport**: Authentication middleware
- **connect-pg-simple**: PostgreSQL session store
- **express-session**: Session management middleware

## Deployment Strategy

### Development Environment
- **Dev Server**: tsx with hot reloading for backend, Vite HMR for frontend
- **Database**: Neon serverless PostgreSQL with connection pooling
- **Environment Variables**: DATABASE_URL, OPENAI_API_KEY, SESSION_SECRET, REPL_ID

### Production Build
- **Frontend**: Vite build outputs to `dist/public` directory
- **Backend**: esbuild bundles server code to `dist/index.js`
- **Static Assets**: Served by Express in production mode
- **Process Management**: Single Node.js process serving both API and static files

### Database Management
- **Schema Migrations**: Drizzle Kit push commands for schema updates
- **Connection Pooling**: Neon serverless handles connection management
- **Environment Separation**: Different database URLs for dev/prod environments

## Changelog

Changelog:
- July 02, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.