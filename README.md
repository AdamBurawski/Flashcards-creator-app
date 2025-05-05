# Flashcards-creator-app

A flashcard creation application that leverages AI to help users quickly generate and manage educational flashcards for effective learning through spaced repetition.

## Table of Contents

- [Flashcards-creator-app](#flashcards-creator-app)
  - [Table of Contents](#table-of-contents)
  - [Project Description](#project-description)
  - [Tech Stack](#tech-stack)
    - [Frontend](#frontend)
    - [Backend](#backend)
    - [AI Integration](#ai-integration)
    - [Testing](#testing)
    - [CI/CD \& Hosting](#cicd--hosting)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
  - [Available Scripts](#available-scripts)
  - [Project Scope](#project-scope)
    - [Core Features](#core-features)
    - [Not in MVP Scope](#not-in-mvp-scope)
  - [Project Status](#project-status)
  - [License](#license)

## Project Description

Flashcards-creator-app addresses the challenge of creating high-quality flashcards, which traditionally requires significant time and effort. The application enables users to:

- Generate flashcards automatically using AI models based on provided text
- Create and manage flashcards manually
- Learn efficiently using a spaced repetition algorithm
- Track flashcard creation and usage statistics

The goal is to streamline the process of creating effective learning materials while maintaining quality, ultimately making the spaced repetition learning method more accessible.

## Tech Stack

### Frontend

- [Astro](https://astro.build/) v5 - Modern web framework for building fast, content-focused websites
- [React](https://react.dev/) v19 - UI library for building interactive components
- [TypeScript](https://www.typescriptlang.org/) v5 - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) v4 - Utility-first CSS framework
- [Shadcn/ui](https://ui.shadcn.com/) - Accessible component library for React

### Backend

- [Supabase](https://supabase.com/) - Backend-as-a-Service platform providing:
  - PostgreSQL database
  - Authentication system
  - SDK for multiple languages
  - Open-source solution that can be self-hosted

### AI Integration

- [Openrouter.ai](https://openrouter.ai/) - API service providing access to various LLM models (OpenAI, Anthropic, Google, etc.) with configurable spending limits

### Testing

- [Vitest](https://vitest.dev/)/[Jest](https://jestjs.io/) - Test runners for unit and integration testing
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) - Testing utilities for React components
- [Playwright](https://playwright.dev/) - End-to-end testing framework for browser automation
- [Supertest](https://github.com/ladjs/supertest) - HTTP assertions for API testing

### CI/CD & Hosting

- GitHub Actions - For CI/CD pipelines
- DigitalOcean - For application hosting via Docker

## Getting Started

### Prerequisites

- Node.js v22.14.0 (as specified in `.nvmrc`)
- npm (comes with Node.js)
- Git

### Installation

1. Clone the repository:

```bash
git clone https://github.com/AdamBurawski/Flashcards-creator-app.git
cd flashcards-creator-app
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

Edit the `.env` file with your Supabase and Openrouter.ai API credentials.

4. Run the development server:

```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:4321`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

## Project Scope

### Core Features

- Automatic flashcard generation using AI
- Manual flashcard creation and management
- User authentication and account management
- Integration with spaced repetition algorithm
- Secure data storage and scalability
- Flashcard generation statistics
- GDPR-compliant data handling

### Not in MVP Scope

- Advanced custom spaced repetition algorithm (using existing open-source solution instead)
- Gamification features
- Mobile applications (web version only)
- Multiple document format imports (PDF, DOCX, etc.)
- Public API
- Flashcard sharing between users
- Advanced notification system
- Advanced keyword search for flashcards

## Project Status

This project is currently in active development. The MVP is being implemented with the features described in the Project Scope section.

## License

MIT
