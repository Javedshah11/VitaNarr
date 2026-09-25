import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Home from '../src/app/page';

describe('VitaNarr foundation page', () => {
  it('introduces the product and its purpose', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { name: 'VitaNarr' })).toBeInTheDocument();
    expect(screen.getByText('Live it.')).toBeInTheDocument();
    expect(screen.getByText('Tell it.')).toBeInTheDocument();
    expect(screen.getByText('Preserve it.')).toBeInTheDocument();
    expect(screen.getByText('Your life deserves to be remembered.')).toBeInTheDocument();
  });
});
