import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  it('renders without crashing', () => {
    // App already provides its own BrowserRouter and QueryClientProvider
    // so we don't need to wrap it
    render(<App />);
    
    // App should render without throwing
    expect(document.body).toBeInTheDocument();
  });
});
