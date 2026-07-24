import { Link, useParams, Navigate } from 'react-router-dom';
import { Calendar, Clock, ArrowLeft } from 'lucide-react';
import TenantNav from '@/components/TenantNav';
import SocialShare from '@/components/SocialShare';
import { BLOG_POSTS, getPost } from './posts';
import { useEffect } from 'react';

export default function BlogPostPage() {
  const { slug } = useParams();
  const post = slug ? getPost(slug) : undefined;

  useEffect(() => {
    if (post) {
      document.title = `${post.title} — UniPathway Blog`;
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute('content', post.excerpt);
    }
    return () => {
      document.title = 'UniPathway — UK & Germany Study Consultancy (Pakistan)';
    };
  }, [post]);

  if (!post) return <Navigate to="/blog" replace />;

  const related = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    author: { '@type': 'Organization', name: post.author },
    datePublished: post.date,
    articleSection: post.category,
  };

  return (
    <div className="min-h-screen bg-background">
      <TenantNav brandName="UniPathway" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> All articles
        </Link>

        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">{post.category}</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
          {post.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-4">
          <span>By {post.author}</span>
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(post.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.readMinutes} min read</span>
        </div>

        <div className="aspect-[16/8] rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 mt-8" />

        <div className="prose prose-sm sm:prose-base max-w-none mt-8 text-foreground/80 space-y-5 leading-relaxed">
          <p className="text-lg font-medium text-foreground/90">{post.excerpt}</p>
          {post.body.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-border">
          <SocialShare title={post.title} />
        </div>

        <aside className="mt-12">
          <h3 className="font-bold text-foreground mb-4">Related articles</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.slug}
                to={`/blog/${r.slug}`}
                className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-all"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">{r.category}</p>
                <p className="text-sm font-semibold text-foreground mt-1 line-clamp-3">{r.title}</p>
              </Link>
            ))}
          </div>
        </aside>
      </article>
    </div>
  );
}
