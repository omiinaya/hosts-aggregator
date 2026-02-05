# Testing Guide

This document provides guidelines for testing the Hosts Aggregator application.

## Overview

We use different testing frameworks for backend and frontend:

- **Backend**: Jest with ts-jest
- **Frontend**: Vitest with React Testing Library

## Backend Testing

### Running Tests

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure

```
backend/src/
├── __tests__/
│   ├── setup.ts              # Test setup and teardown
│   └── helpers/
│       └── test-utils.ts     # Test utilities
├── services/
│   └── __tests__/
│       ├── parser.service.test.ts
│       └── aggregation.service.test.ts
```

### Writing Backend Tests

1. **Test Files**: Place tests in `__tests__` directories next to the code being tested
2. **Naming**: Use `.test.ts` suffix
3. **Utilities**: Use helpers from `test-utils.ts` for common operations

Example:
```typescript
import { HostsParser } from '../../services/parser.service';

describe('HostsParser', () => {
  let parser: HostsParser;

  beforeEach(() => {
    parser = new HostsParser();
  });

  it('should parse standard hosts format', () => {
    const content = '0.0.0.0 example.com';
    const result = parser.parseStandardHosts(content, 'test');
    
    expect(result).toHaveLength(1);
    expect(result[0].domain).toBe('example.com');
  });
});
```

### Test Database

Tests use an isolated test database. The database is cleaned before and after each test.

### Test Utilities

Available utilities in `test-utils.ts`:

- `createTestSource(data)` - Create a test source
- `createTestHostEntry(data)` - Create a test host entry
- `generateStandardHostsContent(domains)` - Generate hosts content
- `generateABPContent(domains, type)` - Generate ABP content

## Frontend Testing

### Running Tests

```bash
cd frontend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### Test Structure

```
frontend/src/
├── __tests__/
│   ├── setup.ts              # Test setup
│   ├── mocks/
│   │   ├── handlers.ts       # MSW handlers
│   │   └── server.ts         # MSW server
│   └── helpers/
│       └── test-utils.tsx    # React testing utilities
├── components/
│   └── __tests__/
│       └── example.test.tsx
```

### Writing Frontend Tests

1. **Test Files**: Place tests in `__tests__` directories
2. **Naming**: Use `.test.tsx` suffix for components
3. **Mocking**: Use MSW for API mocking

Example:
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(document.body).toBeInTheDocument();
  });
});
```

### Mocking API Calls

API calls are mocked using MSW (Mock Service Worker). Add handlers in `__tests__/mocks/handlers.ts`.

### Testing React Components

Use `@testing-library/react` for component testing:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MyComponent from './MyComponent';

it('should handle button click', () => {
  render(
    <BrowserRouter>
      <MyComponent />
    </BrowserRouter>
  );
  
  const button = screen.getByText('Click me');
  fireEvent.click(button);
  
  expect(screen.getByText('Clicked!')).toBeInTheDocument();
});
```

## Coverage Requirements

- **Minimum Coverage**: 60% for all metrics
- **Target Coverage**: 80% for all metrics
- **Coverage Reports**: Generated in `coverage/` directory

## Pre-commit Hooks

Tests are automatically run on pre-commit via lint-staged. Only staged files are checked.

## Best Practices

### General

1. **Test Behavior, Not Implementation**: Test what the code does, not how it does it
2. **One Concept per Test**: Each test should verify one thing
3. **Descriptive Names**: Test names should describe the behavior being tested
4. **AAA Pattern**: Arrange, Act, Assert

### Backend

1. **Mock External Dependencies**: Mock axios, database calls when appropriate
2. **Test Edge Cases**: Empty inputs, invalid data, errors
3. **Clean Database**: Tests should not depend on database state

### Frontend

1. **Test User Interactions**: Click buttons, fill forms
2. **Mock API Calls**: Use MSW, don't hit real API
3. **Test Accessibility**: Use `screen.getByRole` when possible
4. **Avoid Testing Implementation**: Don't test component internals

## Troubleshooting

### Backend Tests

**Issue**: Database connection errors
- **Solution**: Ensure test database is configured in `setup.ts`

**Issue**: Tests timeout
- **Solution**: Increase timeout in `jest.config.js` or mark async tests with `async/await`

### Frontend Tests

**Issue**: MSW not intercepting requests
- **Solution**: Check handler URL patterns match actual requests

**Issue**: React hooks errors
- **Solution**: Wrap components with necessary providers (QueryClient, Router, etc.)

## Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to main/develop branches

All tests must pass before merging.
