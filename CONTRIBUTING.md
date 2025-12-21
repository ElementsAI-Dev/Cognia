# Contributing to Cognia

Thank you for your interest in contributing to Cognia! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
- [Testing](#testing)

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md). We are committed to providing a welcoming and inclusive experience for everyone.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Cognia.git
   cd Cognia
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/ElementsAI-Dev/Cognia.git
   ```
4. **Keep your fork synced**:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

## Development Setup

### Prerequisites

- **Node.js** 20.x or later
- **pnpm** 10.x or later
- **Rust** toolchain (for Tauri desktop builds)

### Installation

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run desktop app (requires Rust)
pnpm tauri dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js development server |
| `pnpm build` | Create production build |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run unit tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm tauri dev` | Run Tauri desktop app |
| `pnpm tauri build` | Build Tauri desktop binaries |

## Making Changes

1. **Create a new branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes** following our [Style Guidelines](#style-guidelines)

3. **Test your changes**:
   ```bash
   pnpm lint
   pnpm test
   pnpm test:e2e
   ```

4. **Commit your changes** following our [Commit Guidelines](#commit-guidelines)

## Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

### Commit Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### Commit Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting, etc.) |
| `refactor` | Code refactoring |
| `perf` | Performance improvements |
| `test` | Test additions or modifications |
| `build` | Build system or dependencies |
| `ci` | CI/CD changes |
| `chore` | Maintenance tasks |
| `revert` | Revert previous commit |

### Examples

```bash
feat(chat): add message threading support
fix(canvas): resolve drag-and-drop issue on Firefox
docs(readme): update installation instructions
refactor(stores): simplify state management logic
```

## Pull Request Process

1. **Ensure your branch is up to date** with `main`
2. **Run all checks** before submitting:
   ```bash
   pnpm lint
   pnpm test
   pnpm exec tsc --noEmit
   ```
3. **Fill out the PR template** completely
4. **Link related issues** using keywords like `Closes #123`
5. **Request review** from maintainers
6. **Address review feedback** promptly
7. **Keep PRs focused** - one feature or fix per PR

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Tests added/updated for changes
- [ ] Documentation updated if needed
- [ ] All CI checks pass
- [ ] PR description is clear and complete

## Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Avoid `any` type; use proper typing
- Use interfaces for object shapes
- Use type guards where appropriate

### React

- Use functional components with hooks
- Use PascalCase for component names
- Co-locate component-specific styles
- Keep components focused and composable

### CSS/Styling

- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Use CSS variables for theming
- Minimize custom CSS; prefer Tailwind utilities

### File Naming

- Components: `PascalCase.tsx` (e.g., `ChatMessage.tsx`)
- Utilities: `kebab-case.ts` (e.g., `message-utils.ts`)
- Hooks: `use-*.ts` (e.g., `use-chat.ts`)
- Tests: `*.test.ts` or `*.test.tsx`

## Testing

### Unit Tests

We use Jest for unit testing. Tests should be co-located with source files.

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run in watch mode
pnpm test:watch
```

### E2E Tests

We use Playwright for end-to-end testing.

```bash
# Run E2E tests
pnpm test:e2e

# Run with UI
pnpm test:e2e:ui

# Run headed (visible browser)
pnpm test:e2e:headed
```

### Writing Tests

- Test behavior, not implementation
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Aim for meaningful coverage, not 100%

## Questions?

If you have questions, feel free to:

- Open a [Discussion](https://github.com/ElementsAI-Dev/Cognia/discussions)
- Check existing [Issues](https://github.com/ElementsAI-Dev/Cognia/issues)
- Review the [README](README.md)

Thank you for contributing! 🎉
