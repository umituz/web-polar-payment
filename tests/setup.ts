import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// vitest runs without `globals: true`, so Testing Library cannot register
// its own afterEach cleanup — do it explicitly to isolate the DOM per test.
afterEach(cleanup);
