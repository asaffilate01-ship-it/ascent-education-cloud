import { Link } from 'react-router-dom';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import TenantNav from '@/components/TenantNav';
import { BLOG_POSTS } from './posts';
import SocialIcons from '@/components/SocialIcons';
import Seo from '@/components/Seo';

const categories = ['All', 'UK', 'Germany', 'Language', 'Guidance'] as const;

export default function BlogListPage() {
  return (
    <div className="min-h-dvh bg-background">
      <Seo title="UniPathway Blog — Study Abroad Guidance for Pakistani Students" description="Guides on UK and Germany admissions, visas, funding, IELTS and accredited diplomas, written for students applying from Pakistan." canonical="/blog" />
      <TenantNav brandName="UniPathway" />

      <header className="border-b border-border bg-gradient-to-br from-primary/5 to-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">UniPathway Blog</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Study-abroad guidance for Pakistani students
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl">
            Visa rules, language exams, and honest advice on picking the right pathway to the UK or Germany.
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            {categories.map((c) => (
              <span
                key={c}
                className="text-xs font-medium px-3 py-1.5 rounded-full bg-card border border-border text-muted-foreground"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {BLOG_POSTS.map((post) => (
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
              </div>
            </article>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-border bg-card p-8 text-center">
          <h3 className="font-bold text-foreground text-lg">Follow UniPathway for weekly guidance</h3>
          <p className="text-sm text-muted-foreground mt-1">Visa updates, scholarship deadlines, and exam tips.</p>
          <SocialIcons className="justify-center mt-4" />
        </div>
      </div>
    </div>
  );
}
