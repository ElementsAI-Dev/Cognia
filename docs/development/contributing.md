# Contributing to Cognia

Thank you for your interest in contributing to Cognia! This guide will help you get started with contributing to the project.

## Table of Contents

- [Contribution Guidelines](#contribution-guidelines)
- [Setting Up Development Environment](#setting-up-development-environment)
- [Making Changes](#making-changes)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Code Review Guidelines](#code-review-guidelines)
- [Documentation Updates](#documentation-updates)

## Contribution Guidelines

### Types of Contributions

We welcome the following types of contributions:

1. **Bug Fixes**: Fix reported issues
2. **New Features**: Add functionality to the application
3. **Documentation**: Improve docs, add guides, fix typos
4. **Performance**: Optimize existing code
5. **Refactoring**: Improve code structure without changing behavior
6. **Testing**: Add tests or improve test coverage
7. **Accessibility**: Improve a11y for all users

### Before You Start

1. **Check existing issues**: Look for [good first issue](https://github.com/your-username/cognia/labels/good%20first%20issue) labels
2. **Join discussions**: Comment on issues you plan to work on
3. **Read documentation**: Familiarize yourself with the codebase
   - [README](../../README.md)
   - [Project Documentation](../../llmdoc/index.md)
   - [Development Guides](./)

### Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## Setting Up Development Environment

### 1. Fork and Clone

```bash
# Fork the repository on GitHub

# Clone your fork
git clone https://github.com/your-username/cognia.git
cd cognia

# Add upstream remote
git remote add upstream https://github.com/original-owner/cognia.git
```

### 2. Install Dependencies

```bash
# Install pnpm if needed
npm install -g pnpm@latest

# Install dependencies
pnpm install
```

### 3. Configure Environment

```bash
# Create environment file
cp .env.example .env.local

# Edit .env.local and add your API keys
# See: getting-started.md#environment-configuration
```

### 4. Start Development

```bash
# Start web dev server
pnpm dev

# Or start desktop app
pnpm tauri dev
```

### 5. Verify Setup

```bash
# Run tests
pnpm test

# Type check
pnpm exec tsc --noEmit

# Lint
pnpm lint
```

## Making Changes

### Branching Strategy

```bash
# Create feature branch from develop
git checkout develop
git pull upstream develop
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description

# Or for documentation
git checkout -b docs/documentation-update
```

### Branch Naming Conventions

Use the following prefixes:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `perf/` - Performance improvements
- `chore/` - Routine tasks, dependencies

**Examples**:

```
feature/add-dark-mode
fix/resolve-memory-leak
docs/update-api-guide
refactor/simplify-state-management
test/add-unit-tests-for-utils
```

### Development Workflow

1. **Make changes** in your feature branch
2. **Test locally** to ensure everything works
3. **Commit changes** with conventional commit messages
4. **Push to your fork**
5. **Create Pull Request**

### Keeping Your Branch Updated

```bash
# Sync with upstream
git fetch upstream
git rebase upstream/develop

# Or merge (if you prefer)
git merge upstream/develop
```

## Testing Requirements

### Before Submitting

Ensure all tests pass:

```bash
# Run unit tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e
```

### Coverage Requirements

- **Lines**: Minimum 70%
- **Branches**: Minimum 60%
- **Functions**: Minimum 60%
- **Statements**: Minimum 70%

### Writing Tests

Add tests for new functionality:

```typescript
// Example: lib/utils.test.ts
describe('new utility function', () => {
  it('should work correctly', () => {
    const result = newFunction('input');
    expect(result).toBe('expected');
  });

  it('should handle edge cases', () => {
    const result = newFunction('');
    expect(result).toBe('');
  });
});
```

### Manual Testing Checklist

Before submitting, test:

- [ ] Feature works as expected
- [ ] No console errors
- [ ] Responsive design works on mobile
- [ ] Dark mode works (if applicable)
- [ ] Keyboard navigation works
- [ ] No accessibility issues
- [ ] Performance is acceptable

## Pull Request Process

### Creating a Pull Request

1. **Push your changes**:

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create PR** on GitHub:
   - Go to your fork on GitHub
   - Click "Compare & pull request"
   - Base: `develop` ← Compare: `feature/your-feature-name`

3. **Fill PR template**:

   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] Unit tests added/updated
   - [ ] E2E tests added/updated
   - [ ] Manual testing completed

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Documentation updated
   - [ ] No new warnings
   - [ ] Tests pass locally
   - [ ] Commit messages follow conventions
   ```

### Pull Request Guidelines

1. **One PR per feature**: Keep PRs focused and manageable
2. **Small PRs**: Aim for < 400 lines changed (excluding tests/docs)
3. **Clear description**: Explain WHAT and WHY, not HOW
4. **Link issues**: Reference related issues (e.g., "Fixes #123")
5. **Add screenshots**: For UI changes, include before/after screenshots

### Conventional Commits for PRs

Use conventional commit in PR title:

```
feat: add dark mode support
fix: resolve memory leak in useEffect
docs: update getting-started guide
refactor: simplify message handling
```

### PR Review Process

1. **Automated checks** must pass:
   - CI/CD pipeline
   - Code coverage requirements
   - Linting checks
   - Type checking

2. **Manual review** by maintainers:
   - Code quality
   - Architecture decisions
   - Performance impact
   - Breaking changes

3. **Address feedback**:
   - Respond to review comments
   - Make requested changes
   - Push updates to branch

4. **Approval and merge**:
   - At least one maintainer approval
   - All checks passing
   - No merge conflicts

### Updating Your PR

```bash
# Make changes
git add .
git commit -m "fix: address reviewer feedback"

# Push to your branch (PR updates automatically)
git push origin feature/your-feature-name
```

## Code Review Guidelines

### For Contributors

1. **Be open to feedback**: Reviews improve code quality
2. **Explain your changes**: Help reviewers understand your approach
3. **Respond promptly**: Keep the review process moving
4. **Make requested changes**: Unless you have strong objections
5. **Ask questions**: If feedback is unclear

### For Reviewers

1. **Be constructive**: Focus on improving the code
2. **Explain reasoning**: Help contributors understand
3. **Prioritize issues**: Blockers vs. nice-to-haves
4. **Be respectful**: Treat contributors with respect
5. **Approve when ready**: Don't delay for perfection

### Review Checklist

**Functionality**:

- [ ] Does it work as intended?
- [ ] Are edge cases handled?
- [ ] Is error handling appropriate?

**Code Quality**:

- [ ] Is code readable and maintainable?
- [ ] Are functions focused and reusable?
- [ ] Is naming clear and consistent?

**Testing**:

- [ ] Are tests comprehensive?
- [ ] Do tests cover edge cases?
- [ ] Is test coverage adequate?

**Documentation**:

- [ ] Is code documented?
- [ ] Are comments clear?
- [ ] Is user documentation updated?

**Performance**:

- [ ] Are there performance concerns?
- [ ] Is memory usage appropriate?
- [ ] Are there optimizations needed?

**Security**:

- [ ] Are inputs validated?
- [ ] Are secrets protected?
- [ ] Are there security vulnerabilities?

## Documentation Updates

### When to Update Docs

Update documentation when:

1. **Adding features**: Document new functionality
2. **Changing behavior**: Update existing docs
3. **Breaking changes**: Clearly document migration
4. **API changes**: Update type definitions
5. **Configuration changes**: Update examples

### Documentation Files

**Project Documentation** (`llmdoc/`):

```
llmdoc/
├── index.md              # Documentation index
└── feature/
    ├── phase-2-overview.md
    ├── artifacts-system.md
    └── ...
```

**Development Guides** (`docs/development/`):

```
docs/development/
├── getting-started.md    # Setup and installation
├── project-structure.md  # Codebase organization
├── coding-standards.md   # Code style and patterns
├── testing.md           # Testing guide
├── building.md          # Build and deployment
└── contributing.md      # This file
```

### Writing Documentation

**Use clear language**:

- Explain technical concepts clearly
- Provide examples for complex topics
- Use code blocks for examples

**Include diagrams**:

```
## Architecture Flow

User → Component → Store → API → Backend
```

**Add code examples**:

```typescript
// Usage example
const { addMessage } = useMessages();
addMessage({ id: '1', content: 'Hello' });
```

### Updating Feature Documentation

When adding features:

1. **Update feature doc** in `llmdoc/feature/`
2. **Update overview** if adding major feature
3. **Update README** if user-facing
4. **Add type definitions** in `/types/`
5. **Export from index** in relevant directories

### Updating Type Documentation

Document new types with JSDoc:

```typescript
/**
 * Message interface
 *
 * Represents a chat message with support for multiple content types
 * including text, images, code, and tool calls.
 *
 * @example
 * ```typescript
 * const message: Message = {
 *   id: 'msg-123',
 *   role: 'user',
 *   content: 'Hello, AI!',
 *   timestamp: new Date()
 * };
 * ```
 */
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}
```

## Getting Help

### Resources

1. **Documentation**:
   - [Project README](../../README.md)
   - [Feature Documentation](../../llmdoc/index.md)
   - [Development Guides](./)

2. **External Resources**:
   - [Next.js Documentation](https://nextjs.org/docs)
   - [React Documentation](https://react.dev)
   - [Tauri Documentation](https://tauri.app/)
   - [Vercel AI SDK](https://sdk.vercel.ai)

3. **Community**:
   - GitHub Issues: Report bugs or request features
   - GitHub Discussions: Ask questions or share ideas
   - Pull Requests: Contribute code or documentation

### Asking Questions

When asking questions:

1. **Search first**: Check existing issues and docs
2. **Be specific**: Provide details about your problem
3. **Include context**: Share code snippets, error messages
4. **Use appropriate channels**: Issues for bugs, Discussions for questions

### Question Template

```markdown
## Question
Brief description of your question

## Context
- What are you trying to do?
- What have you tried?
- What did you expect?

## Code/Screenshots
```typescript
// Your code here
```

## Environment

- OS: [e.g., Windows 11]
- Node.js: [e.g., v20.x.x]
- Browser: [e.g., Chrome 120]

```

## Recognition

Contributors are recognized in:

- **CONTRIBUTORS.md**: List of all contributors
- **Release notes**: For significant contributions
- **Documentation**: For documentation improvements

Thank you for contributing to Cognia!

## Additional Resources

- [Getting Started Guide](./getting-started.md)
- [Project Structure](./project-structure.md)
- [Coding Standards](./coding-standards.md)
- [Testing Guide](./testing.md)
- [Building Guide](./building.md)

---

**Last Updated**: December 25, 2025
