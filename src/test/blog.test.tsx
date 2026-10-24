import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import BlogListPage from '@/pages/blog/BlogListPage';
import BlogPostPage from '@/pages/blog/BlogPostPage';
import { BLOG_POSTS } from '@/pages/blog/posts';
import { SITE_URL } from '@/lib/publicSeo';
vi.mock('@/components/PublicNav', async importOriginal => ({ ...await importOriginal<typeof import('@/components/PublicNav')>(), default: () => <nav>Public navigation</nav> }));
afterEach(cleanup);
it('filters illustrated articles by category and search, and recovers from empty results', () => {
  render(<MemoryRouter><BlogListPage /></MemoryRouter>);
  expect(screen.getAllByRole('article')).toHaveLength(BLOG_POSTS.length);
  fireEvent.click(screen.getByRole('button', { name: 'Germany' }));
  expect(screen.getAllByRole('article')).toHaveLength(1);
  expect(within(screen.getByRole('article')).getByRole('img')).toHaveAttribute('src', '/blog/germany-sperrkonto.jpg');
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'nonexistent topic' } });
  expect(screen.queryByRole('article')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(screen.getAllByRole('article')).toHaveLength(BLOG_POSTS.length);
  expect(screen.getByText('10 Civil Lines, Jhelum, 49600, Pakistan')).toBeInTheDocument();
  expect(screen.getByText('3rd Floor, 45 Albemarle Street, Mayfair, London, W1S 4JL, England')).toBeInTheDocument();
});
it('shares the published canonical URL without preview origins or tracking parameters', () => {
  const post = BLOG_POSTS[0];
  render(<MemoryRouter initialEntries={[`/blog/${post.slug}?utm_source=private#example`]}><Routes><Route path="/blog/:slug" element={<BlogPostPage />} /></Routes></MemoryRouter>);
  const canonical = `${SITE_URL}/blog/${post.slug}`;
  expect(screen.getByRole('link', { name: 'Share on Facebook' })).toHaveAttribute('href', `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonical)}`);
  expect(document.querySelector('meta[property="og:image"]')).toHaveAttribute('content', SITE_URL + post.cover);
  expect(screen.getAllByRole('img')).toHaveLength(5); // Cover, related covers, footer logo.
  expect(screen.getByText('Powered by iTechLounge')).toBeInTheDocument();
  expect(screen.getByText('ITech Education Ltd')).toBeInTheDocument();
});
