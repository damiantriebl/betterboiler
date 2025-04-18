// src/__tests__/setup.tsx
import type React from 'react';

type TestButtonProps = {
  children: React.ReactNode;
  pending: boolean;
} & Record<string, unknown>;

export const TestButton: React.FC<TestButtonProps> = ({ children, pending, ...props }) => (
  <button disabled={pending} {...props}>
    {children}
  </button>
);
