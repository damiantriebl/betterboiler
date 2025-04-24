import React from 'react';

interface DetailItemProps {
  label: string;
  value: React.ReactNode;
}

export const DetailItem: React.FC<DetailItemProps> = ({ label, value }) => (
  <div>
    <span className="text-sm font-medium text-muted-foreground">{label}:</span>{' '}
    <span className="text-sm">{value ?? 'N/A'}</span>
  </div>
);
