import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EmployerLogoBanner from '@/components/career/EmployerLogoBanner';
import { employerBrands } from '@/data/employerBrands';

describe('Employer logo banner', () => {
  it('exposes every employer once per accessible list and provides motion controls', () => {
    render(<MemoryRouter><EmployerLogoBanner /></MemoryRouter>);
    expect(within(screen.getByRole('list', { name: 'Our group brands' })).getAllByRole('listitem')).toHaveLength(12);
    expect(within(screen.getByRole('list', { name: 'Employers to explore' })).getAllByRole('listitem')).toHaveLength(15);
    fireEvent.click(screen.getByRole('button', { name: 'Pause scrolling' }));
    expect(screen.getByRole('button', { name: 'Resume scrolling' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'View all employers' }));
    expect(screen.getByRole('button', { name: 'Show scrolling banner' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Resume scrolling' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Ask about internships' })).toHaveAttribute('href', '/contact');
  });
  it('has distinct Merqora and Merqano identities and only bundled logos', () => {
    expect(new Set(employerBrands.map(b => b.id)).size).toBe(27);
    expect(employerBrands.find(b => b.id === 'merqora')?.logo).not.toBe(employerBrands.find(b => b.id === 'merqano')?.logo);
    expect(employerBrands.every(b => b.logo.startsWith('/brand/employers/'))).toBe(true);
  });
});
