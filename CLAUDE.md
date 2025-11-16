# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js 16 web app with React 19, TypeScript, and Tailwind CSS 4. Uses shadcn/ui component library (New York style) for UI components. Main feature: async job execution dashboard that simulates job lifecycle management.

## Development Commands

```bash
npm run dev     # Start dev server at localhost:3000
npm run build   # Production build
npm start       # Run production server
npm run lint    # Run ESLint
```

## Architecture

### App Router Structure
- Next.js App Router with server/client components
- Root: `app/layout.tsx` (Geist fonts, global styles)
- Home: `app/page.tsx` (renders JobDashboard)
- Global styles: `app/globals.css`

### Component Organization
- `components/ui/*` - shadcn/ui primitives (Button, Card, Badge, Progress, Input)
- `components/job-dashboard.tsx` - Main feature component
- `lib/utils.ts` - Utility functions (cn for classNames)

### Path Aliases
All imports use `@/*` alias pointing to project root:
```typescript
import { JobDashboard } from "@/components/job-dashboard"
import { cn } from "@/lib/utils"
```

### Styling
- Tailwind CSS 4 with PostCSS
- CSS variables for theming (defined in globals.css)
- shadcn/ui configuration in `components.json`:
  - Style: new-york
  - Base color: gray
  - CSS variables enabled
  - Icon library: lucide-react

### Job Dashboard Logic
Core component simulating async job execution:
- Job states: pending → running → completed/failed/cancelled
- Auto-progression: useEffect interval updates running jobs every 500ms
- Features: create, cancel, retry, delete jobs; filter by status
- Progress simulation: random increments until 100%, then 85% success rate

## TypeScript Config
- Strict mode enabled
- Target: ES2017
- Path alias `@/*` maps to root
- JSX preserve mode for Next.js
