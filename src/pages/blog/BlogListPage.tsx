import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { BLOG_POSTS } from './posts';
import SocialShare from '@/components/SocialShare';
import { SITE_URL } from '@/lib/publicSeo';
import Seo from '@/components/Seo';

const categories = ['All', 'UK', 'Germany', 'Language', 'Guidance'] as const;

export default function BlogListPage() {
  const [category, setCategory] = useState<string>('All');
  const [search, setSearch] = useState('');
  const posts = BLOG_POSTS.filter(post => (category === 'All' || post.category === category)
    && `${post.title} ${post.excerpt} ${post.category}`.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <div className="min-h-dvh bg-background">
      <Seo title="UniPathway Blog — Study Abroad Guidance for Pakistani Students" description="Guides on UK and Germany admissions, visas, funding, IELTS and accredited diplomas, written for students applying from Pakistan." canonical="/blog" />
      <PublicNav />

      <header className="border-b border-border bg-gradient-to-br from-primary/5 to-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">UniPathway Blog</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Study-abroad guidance for Pakistani students
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl">
            Visa rules, language exams, and honest advice on picking the right pathway to the UK or Germany.
          </p>
          <label className="block mt-6 max-w-md text-sm font-medium">Search articles
            <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search topics or guides" className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-3" />
          </label>
          <div className="flex flex-wrap gap-2 mt-6" aria-label="Article categories">
            {categories.map((c) => (
              <button
                type="button"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                key={c}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border border-border ${category === c ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="mb-6 text-sm text-muted-foreground" role="status">{posts.length} {posts.length === 1 ? 'article' : 'articles'} found</p>
        {posts.length === 0 && <div className="rounded-xl border p-8 mb-6"><p>No articles match your search.</p><button className="mt-3 text-primary underline" onClick={() => { setSearch(''); setCategory('All'); }}>Clear filters</button></div>}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="group rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg transition-all"
            >
              <div className="aspect-[16/9] overflow-hidden bg-muted relative">
                <img
                  src={post.cover}
                  alt={post.coverAlt}
                  loading="lazy"
                  width={1280}
                  height={720}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-widest text-primary-foreground bg-primary/90 backdrop-blur px-2 py-1 rounded">
                  {post.category}
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-2">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(post.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.readMinutes} min read</span>
                </div>
                <h2 className="font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                  <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                </h2>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{post.excerpt}</p>
                <Link
                  to={`/blog/${post.slug}`}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary"
                >
                  Read article <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <SocialShare className="mt-4" title={post.title} url={`${SITE_URL}/blog/${post.slug}`} />
              </div>
            </article>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-border bg-card p-8 text-center">
          <h2 className="font-bold text-foreground text-lg">Need help choosing your next step?</h2>
          <p className="text-sm text-muted-foreground mt-2">Discuss courses, language preparation and study pathways with our team.</p>
          <Link to="/contact" className="mt-4 inline-block font-semibold text-primary underline">Contact UniPathway</Link>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
