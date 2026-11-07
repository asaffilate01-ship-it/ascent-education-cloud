import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, expect, it, vi} from 'vitest';
import PromoHome from '@/pages/promo/PromoHome';

vi.mock('@/components/PublicNav', () => ({default: () => null}));
vi.mock('@/components/PublicFooter', () => ({default: () => null}));
vi.mock('@/components/Seo', () => ({default: () => null}));
vi.mock('@/components/promo/LearningHero', () => ({default: () => null}));
afterEach(cleanup);

const mount = () => render(<MemoryRouter><PromoHome /></MemoryRouter>);

it('finds a learning area by words in any order across its title and description', () => {
  mount();
  const search = screen.getByRole('searchbox', {name: 'Search learning areas'});
  fireEvent.change(search, {target: {value: '  CLOUD   Ｐｙｔｈｏｎ  '}});
  expect(screen.getByRole('link', {name: /Technology Academy AI/})).toHaveAttribute('href', '/tech-academy');
  expect(screen.getByRole('status')).toHaveTextContent('1 matching learning area');
  expect(screen.queryByRole('heading', {name: 'German Courses'})).toBeNull();
  fireEvent.change(search, {target: {value: 'Python cloud'}});
  expect(screen.getByRole('heading', {name: 'Technology Academy'})).toBeInTheDocument();
  fireEvent.change(search, {target: {value: 'Python cloud impossible'}});
  expect(screen.getByRole('status')).toHaveTextContent('0 matching learning areas');
});

it('combines subject and text filters, then restores discovery and keyboard focus after no matches', () => {
  mount();
  const search = screen.getByRole('searchbox', {name: 'Search learning areas'});
  fireEvent.click(screen.getByRole('button', {name: 'Languages'}));
  fireEvent.change(search, {target: {value: 'practice IELTS'}});
  expect(screen.getByRole('link', {name: /IELTS Preparation Academic/})).toHaveAttribute('href', '/ielts-preparation');
  expect(screen.getByRole('status')).toHaveTextContent('1 matching learning area');
  fireEvent.change(search, {target: {value: 'Python cloud'}});
  expect(screen.queryByRole('heading', {name: 'Technology Academy'})).toBeNull();
  fireEvent.click(screen.getByRole('button', {name: 'Show all learning areas'}));
  expect(search).toHaveValue('');
  expect(search).toHaveFocus();
  expect(screen.getByRole('button', {name: 'All subjects'})).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('heading', {name: 'Technology Academy'})).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Explore all learning areas');
});
