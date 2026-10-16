import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import StudyPriorities from '@/pages/promo/StudyPriorities';
vi.mock('@/components/Seo', () => ({ default: () => null }));
describe('study priorities discovery', () => {
  it('finds science tuition and funded enquiries without presenting guaranteed funding', () => {
    render(<MemoryRouter><StudyPriorities /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Search subjects and training'), { target: { value: 'chemistry' } });
    expect(screen.getByRole('heading', { name: 'Subject tuition' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'OTHM qualifications' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search subjects and training'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Funding' }));
    expect(screen.getByRole('status')).toHaveTextContent('2 study options');
    expect(screen.getByText(/Scheme, provider approval, eligibility/)).toBeInTheDocument();
    expect(screen.getByText('Canada', { exact: true })).toBeInTheDocument();
  });
});
