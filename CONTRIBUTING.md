# Contributing to Hosts Aggregator

Thank you for your interest in contributing to Hosts Aggregator! This document provides guidelines and instructions for contributing.

## Development Setup

1. **Prerequisites**
   - Node.js 20 (use `nvm use` to switch to correct version)
   - npm or yarn

2. **Installation**
   ```bash
   git clone <repository-url>
   cd hosts-aggregator
   npm run install:all
   
   # Backend setup
   cd backend
   cp .env.example .env
   npx prisma generate
   npx prisma migrate dev
   
   # Frontend setup
   cd ../frontend
   cp .env.example .env
   ```

3. **Running the Application**
   ```bash
   npm run dev  # Starts both backend and frontend
   ```

## Git Workflow

We follow a feature branch workflow:

1. Create a new branch from `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. Push and create a Pull Request:
   ```bash
   git push origin feature/your-feature-name
   ```

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `test:` Adding or updating tests
- `chore:` Build process or auxiliary tool changes

Examples:
```
feat: add source category filtering
fix: resolve aggregation memory leak
docs: update API documentation
```

## Code Quality

Before submitting a PR:

1. **Run tests:**
   ```bash
   npm run test
   ```

2. **Run linter:**
   ```bash
   npm run lint
   ```

3. **Type check:**
   ```bash
   npm run type-check
   ```

4. **Format code:**
   ```bash
   npm run format
   ```

## Pull Request Process

1. Update the README.md or documentation if needed
2. Ensure all tests pass
3. Update the ATTACK_PLAN.md if completing a task
4. Request review from maintainers
5. Address review comments
6. Merge will be handled by maintainers

## Code Style

- Use TypeScript for all new code
- Follow existing code patterns
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Keep functions small and focused

## Testing

- Write tests for new features
- Maintain test coverage above 80%
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

## Questions?

If you have questions, please:
1. Check existing documentation in `docs/`
2. Search existing issues
3. Create a new issue with the "question" label

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
