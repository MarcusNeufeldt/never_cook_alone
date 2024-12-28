# Never Cook Alone

A social recipe sharing platform built with Next.js where cooking enthusiasts can discover, share, and organize recipes together.

## Features

- **Featured Recipes**: Discover highlighted recipes on the home page
- **Recipe Categories**: Browse recipes by categories
- **Recent Recipes Feed**: Stay updated with the latest shared recipes
- **Recipe Gallery**: Visual grid display of all available recipes
- **Recipe Creation**: Easy-to-use form for adding new recipes
- **Responsive Design**: Optimized for both desktop and mobile devices
- **Authentication**: Secure Google authentication via Supabase
- **User Profiles**: Personalized user experience with profile management

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org) 14.2
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth with Google provider
- **UI Components**: 
  - Radix UI for accessible components
  - Framer Motion for animations
- **Development Tools**:
  - ESLint for code quality
  - PostCSS for CSS processing

## Project Structure

```
never_cook_alone/
├── app/                  # Next.js app directory
│   ├── auth/            # Authentication routes
│   │   └── callback/    # OAuth callback handler
│   ├── recipes/         # Recipe-related routes
│   ├── fonts/          # Font configuration
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Main dashboard
│   └── globals.css     # Global styles
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components
│   ├── Auth.tsx        # Authentication component
│   ├── Header.tsx      # App header with user menu
│   ├── AddRecipeForm.tsx
│   ├── BottomNav.tsx
│   ├── CategoryList.tsx
│   ├── FeaturedRecipe.tsx
│   ├── InteractiveRecipeView.tsx
│   ├── RecentRecipes.tsx
│   ├── RecipeGallery.tsx
│   └── SearchBar.tsx
├── lib/                 # Utility functions
│   └── supabase.ts     # Supabase client
└── middleware.ts       # Auth middleware
```

## Authentication Flow

The authentication system is handled through:
- `middleware.ts` for session management
- `app/auth/callback/route.ts` for OAuth callbacks
- `components/Auth.tsx` for the sign-in interface
