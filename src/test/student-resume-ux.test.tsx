import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ContinueLearning from '@/components/student/ContinueLearning';
import StudentDashboard from '@/pages/student/StudentDashboard';
import { chooseContinueLesson, currentLessonCompletion, type ContinueLesson } from '@/lib/learning/continueLearning';
import type { LessonProgress } from '@/lib/structuredLessons';

type Row = Record<string, unknown>;
const mock = vi.hoisted(() => ({
  user: { id: 'learner', tenantId: 'centre', name: 'Learner', role: 'student', roles: ['student'] },
  from: vi.fn(), filters: vi.fn(), query: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mock.user }) }));
vi.mock('@/lib/db', () => ({ db: { from: (...args: unknown[]) => mock.from(...args) } }));
vi.mock('@/hooks/useSupabaseQuery', () => ({ useSupabaseQuery: (...args: unknown[]) => mock.query(...args) }));
vi.mock('@/components/layout/DashboardLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock('@/components/student/StudentLearningAgenda', () => ({ default: () => null }));
vi.mock('@/components/student/STEMCoachLearningAccess', () => ({ default: () => null }));

let tables: Record<string, Row[]>;
let failure: string;
let delay: { table: string; pending: Promise<void> } | null;
const modules = [{ id: 'module', title: 'Applied mathematics', code: 'MATH' }, { id: 'other-module', title: 'Study skills' }];
const lesson = (id: string, position = 1, change: Partial<ContinueLesson> = {}): ContinueLesson => ({
  id, module_id: 'module', tenant_id: 'centre', title: `Lesson ${id}`, status: 'published', position, revision: 1, ...change,
});
const progress = (id: string, change: Partial<LessonProgress> = {}): LessonProgress => ({
  lesson_id: id, revision: 1, completed: false, position_seconds: 45, updated_at: '2026-11-06T09:00:00Z', ...change,
});
const savedRow = (id: string, change: Partial<LessonProgress> = {}) => ({ student_id: 'learner', ...progress(id, change) });
const mount = (items = modules) => render(<MemoryRouter><ContinueLearning modules={items} /></MemoryRouter>);

beforeEach(() => {
  mock.user = { id: 'learner', tenantId: 'centre', name: 'Learner', role: 'student', roles: ['student'] };
  failure = ''; delay = null;
  tables = { unipathway_lessons: [lesson('first'), lesson('recent', 2)], unipathway_lesson_progress: [savedRow('recent')] };
  mock.query.mockImplementation((table: string, options: { enabled: boolean; filters: { column: string; operator: string; value: unknown }[] }) => ({
    data: !options.enabled ? [] : (tables[table] || []).filter(row => options.filters.every(filter =>
      filter.operator === 'in' ? (filter.value as unknown[]).includes(row[filter.column]) : row[filter.column] === filter.value)),
    loading: false, error: null, refetch: vi.fn(),
  }));
  mock.from.mockImplementation((table: string) => {
    const filters: { method: string; column: string; value: unknown }[] = [];
    let range: [number, number] | null = null;
    let limit: number | null = null;
    const query: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'in', 'order', 'range', 'limit']) query[method] = (...args: unknown[]) => {
      mock.filters(table, method, ...args);
      if (method === 'eq' || method === 'in') filters.push({ method, column: args[0] as string, value: args[1] });
      if (method === 'range') range = args as [number, number];
      if (method === 'limit') limit = args[0] as number;
      return query;
    };
    query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => {
      let rows = (tables[table] || []).filter(row => filters.every(filter => filter.method === 'in'
        ? (filter.value as unknown[]).includes(row[filter.column]) : row[filter.column] === filter.value));
      if (range) rows = rows.slice(range[0], range[1] + 1);
      if (limit !== null) rows = rows.slice(0, limit);
      const result = { data: rows, error: table === failure ? { message: 'Unavailable' } : null };
      return (delay?.table === table ? delay.pending.then(() => result) : Promise.resolve(result)).then(resolve, reject);
    };
    return query;
  });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('dashboard lesson continuation', () => {
  it('resumes the most recent unfinished current lesson, even after a newer completion', () => {
    const lessons = [lesson('first'), lesson('recent', 2), lesson('done', 3)];
    const saved = [progress('first', { updated_at: '2026-11-01T09:00:00Z' }), progress('recent'), progress('done', { completed: true, updated_at: '2026-11-07T09:00:00Z' })];
    expect(chooseContinueLesson(lessons, saved)).toMatchObject({ lesson: { id: 'recent' }, reason: 'resume' });
    expect(currentLessonCompletion(lessons, saved)).toBe(1);
  });

  it('continues the recently studied module before suggesting an unrelated new module', () => {
    const lessons = [lesson('unrelated', 1, { module_id: 'a-other-module' }), lesson('done'), lesson('next', 2)];
    expect(chooseContinueLesson(lessons, [progress('done', { completed: true })])).toMatchObject({ lesson: { id: 'next' }, reason: 'next' });
  });

  it('does not count an older revision as completion or show its saved position', async () => {
    tables.unipathway_lessons = [lesson('revised', 1, { revision: 2 })];
    tables.unipathway_lesson_progress = [savedRow('revised', { completed: true })];
    mount();
    expect(await screen.findByRole('link', { name: 'Open updated lesson' })).toHaveAttribute('href', '/student/lessons?module=module&lesson=revised');
    expect(screen.getByText(/0 of 1 current lessons completed/)).toBeInTheDocument();
    expect(screen.queryByText(/Last synced/)).not.toBeInTheDocument();
  });

  it('uses an exact lesson route and scopes progress to published enrolled lessons and this student', async () => {
    tables.unipathway_lessons.push(
      lesson('withdrawn', 3, { status: 'archived' }),
      lesson('other-centre', 1, { tenant_id: 'other-centre' }),
      lesson('not-enrolled', 1, { module_id: 'not-enrolled' }),
    );
    tables.unipathway_lesson_progress.push(
      savedRow('withdrawn', { updated_at: '2026-11-07T09:00:00Z' }),
      { ...savedRow('first', { updated_at: '2026-11-07T10:00:00Z' }), student_id: 'another-learner' },
    );
    mount();
    expect(await screen.findByRole('link', { name: 'Resume lesson' })).toHaveAttribute('href', '/student/lessons?module=module&lesson=recent');
    expect(screen.getByRole('heading', { name: 'Lesson recent' })).toBeInTheDocument();
    expect(mock.filters).toHaveBeenCalledWith('unipathway_lessons', 'eq', 'tenant_id', 'centre');
    expect(mock.filters).toHaveBeenCalledWith('unipathway_lessons', 'eq', 'status', 'published');
    expect(mock.filters).toHaveBeenCalledWith('unipathway_lesson_progress', 'eq', 'student_id', 'learner');
    expect(mock.filters).toHaveBeenCalledWith('unipathway_lesson_progress', 'in', 'lesson_id', ['first', 'recent']);
    expect(mock.from.mock.calls.every(([table]) => ['unipathway_lessons', 'unipathway_lesson_progress'].includes(table))).toBe(true);
  });

  it('labels a first visit as starting a lesson, and all current completions as review', async () => {
    tables.unipathway_lesson_progress = [];
    const view = mount();
    expect(await screen.findByRole('link', { name: 'Start lesson' })).toHaveAttribute('href', '/student/lessons?module=module&lesson=first');
    expect(screen.getByText(/No synced lesson progress yet/)).toBeInTheDocument();
    view.unmount();
    tables.unipathway_lesson_progress = [savedRow('first', { completed: true }), savedRow('recent', { completed: true, updated_at: '2026-11-07T09:00:00Z' })];
    mount();
    expect(await screen.findByRole('link', { name: 'Review lesson' })).toHaveAttribute('href', '/student/lessons?module=module&lesson=recent');
    expect(screen.getByText(/2 of 2 current lessons completed/)).toBeInTheDocument();
  });

  it('offers an explicitly labelled module fallback only after confirming no published lessons', async () => {
    tables.unipathway_lessons = [lesson('archived', 1, { status: 'archived' })];
    mount([modules[0]]);
    expect(await screen.findByRole('heading', { name: 'No published lessons yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Applied mathematics module' })).toHaveAttribute('href', '/student/module?module=module');
    expect(mock.from).not.toHaveBeenCalledWith('unipathway_lesson_progress');
    expect(screen.queryByRole('link', { name: 'Resume lesson' })).not.toBeInTheDocument();
  });

  it('does not resume a lesson that was withdrawn while progress was saved for it', async () => {
    tables.unipathway_lessons = [lesson('first'), lesson('recent', 2, { status: 'archived' })];
    mount();
    expect(await screen.findByRole('link', { name: 'Start lesson' })).toHaveAttribute('href', '/student/lessons?module=module&lesson=first');
    expect(screen.queryByRole('heading', { name: 'Lesson recent' })).not.toBeInTheDocument();
    expect(mock.filters).toHaveBeenCalledWith('unipathway_lesson_progress', 'in', 'lesson_id', ['first']);
  });

  it.each(['unipathway_lessons', 'unipathway_lesson_progress'])('separates a %s failure from empty learning and recovers on retry', async table => {
    failure = table; mount();
    await screen.findByRole('alert');
    expect(screen.queryByText(/No synced lesson progress yet|No published lessons yet/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Resume lesson' })).not.toBeInTheDocument();
    failure = ''; fireEvent.click(screen.getByRole('button', { name: 'Retry learning progress' }));
    expect(await screen.findByRole('link', { name: 'Resume lesson' })).toBeInTheDocument();
  });

  it('hides a withdrawn enrolment immediately and ignores its pending progress response', async () => {
    let release: () => void;
    delay = { table: 'unipathway_lesson_progress', pending: new Promise(resolve => { release = resolve; }) };
    const view = mount();
    await waitFor(() => expect(mock.from).toHaveBeenCalledWith('unipathway_lesson_progress'));
    view.rerender(<MemoryRouter><ContinueLearning modules={[]} /></MemoryRouter>);
    await screen.findByText('No modules are available for your active enrolments.');
    await act(async () => { release!(); });
    expect(screen.queryByRole('heading', { name: 'Lesson recent' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Resume lesson' })).not.toBeInTheDocument();
  });

  it('does not display a late student response after the active role changes', async () => {
    let release: () => void;
    delay = { table: 'unipathway_lesson_progress', pending: new Promise(resolve => { release = resolve; }) };
    const view = mount();
    await waitFor(() => expect(mock.from).toHaveBeenCalledWith('unipathway_lesson_progress'));
    const reads = mock.from.mock.calls.length;
    mock.user = { ...mock.user, role: 'lecturer', roles: ['student', 'lecturer'] };
    view.rerender(<MemoryRouter><ContinueLearning modules={modules} /></MemoryRouter>);
    await screen.findByRole('alert');
    await act(async () => { release!(); });
    expect(mock.from).toHaveBeenCalledTimes(reads);
    expect(screen.queryByText('Lesson recent')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Resume lesson' })).not.toBeInTheDocument();
  });

  it('drops previously rendered learning immediately when student and centre change', async () => {
    const view = mount();
    await screen.findByRole('heading', { name: 'Lesson recent' });
    mock.user = { ...mock.user, id: 'new-learner', tenantId: 'new-centre' };
    const newModule = { id: 'new-module', title: 'New centre module' };
    view.rerender(<MemoryRouter><ContinueLearning modules={[newModule]} /></MemoryRouter>);
    expect(screen.queryByText('Lesson recent')).not.toBeInTheDocument();
    await screen.findByRole('heading', { name: 'No published lessons yet' });
    expect(mock.filters).toHaveBeenCalledWith('unipathway_lessons', 'eq', 'tenant_id', 'new-centre');
  });

  it('does not make lesson reads without active enrolled modules', async () => {
    mount([]);
    await screen.findByText('No modules are available for your active enrolments.');
    expect(mock.from).not.toHaveBeenCalled();
  });
});

describe('released grade context', () => {
  const dashboard = () => render(<MemoryRouter><StudentDashboard /></MemoryRouter>);
  beforeEach(() => {
    tables.student_enrolments = [{ id: 'enrolment', student_id: 'learner', tenant_id: 'centre', programme_id: 'programme', status: 'active' }];
    tables.programmes = [{ id: 'programme', tenant_id: 'centre', title: 'Programme' }];
    tables.modules = [{ ...modules[0], tenant_id: 'centre', programme_id: 'programme' }];
    tables.unipathway_assessment_released_results = [{ attempt_id: 'released', brief_id: 'brief', student_id: 'learner', tenant_id: 'centre', final_score: 72, released_at: '2026-11-06T09:00:00Z' }];
    tables.unipathway_assessment_grade_amendments = [{ attempt_id: 'released', brief_id: 'brief', student_id: 'learner', tenant_id: 'centre', corrected_final_score: 78 }];
    tables.unipathway_assessment_briefs = [
      { id: 'brief', module_id: 'module', tenant_id: 'centre', title: 'Statistical investigation' },
      { id: 'private-brief', module_id: 'module', tenant_id: 'centre', title: 'Unreleased private assessment' },
    ];
  });

  it('shows an authorised assessment title and corrected score with the existing module feedback route', async () => {
    dashboard();
    expect(await screen.findByRole('heading', { name: 'Statistical investigation' })).toBeInTheDocument();
    expect(screen.getByText('78/100')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View approved feedback for Statistical investigation' })).toHaveAttribute('href', '/student/grades?module=module');
    expect(screen.queryByText('Unreleased private assessment')).not.toBeInTheDocument();
    expect(mock.filters).toHaveBeenCalledWith('unipathway_assessment_briefs', 'in', 'id', ['brief']);
    expect(mock.filters).toHaveBeenCalledWith('unipathway_assessment_released_results', 'eq', 'student_id', 'learner');
    expect(mock.from).not.toHaveBeenCalledWith('submissions');
    expect(mock.from).not.toHaveBeenCalledWith('unipathway_assessment_marks');
  });

  it('keeps a valid released-results fallback when assessment metadata is not accessible', async () => {
    tables.unipathway_assessment_briefs = [];
    dashboard();
    expect(await screen.findByText('78/100')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View approved feedback for this coursework' })).toHaveAttribute('href', '/student/grades');
    expect(screen.queryByText('Statistical investigation')).not.toBeInTheDocument();
  });

  it('shows an explicit unknown average, not NaN, for invalid or cross-centre released evidence', async () => {
    tables.unipathway_assessment_released_results = [
      { ...tables.unipathway_assessment_released_results[0], final_score: Number.NaN },
    ];
    dashboard();
    expect(await screen.findByText('Secure approved grades are unavailable.')).toBeInTheDocument();
    expect(screen.queryByText('NaN%')).not.toBeInTheDocument();
    expect(screen.queryByText('78/100')).not.toBeInTheDocument();
    expect(screen.getByText('Approved Average').closest('div')).toHaveTextContent('—');
  });

  it('rejects a mismatched appeal correction rather than showing another assessment score', async () => {
    tables.unipathway_assessment_grade_amendments = [
      { ...tables.unipathway_assessment_grade_amendments[0], brief_id: 'different-brief' },
    ];
    dashboard();
    expect(await screen.findByText('Secure approved grades are unavailable.')).toBeInTheDocument();
    expect(screen.queryByText('78/100')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', {name: 'Statistical investigation'})).toBeNull();
  });

  it('shows a legitimate zero-point independent appeal correction and its status', async () => {
    tables.unipathway_assessment_grade_amendments = [
      { ...tables.unipathway_assessment_grade_amendments[0], corrected_final_score: 0 },
    ];
    dashboard();
    expect(await screen.findByText('0/100')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText(/independently amended after appeal/)).toBeInTheDocument();
    expect(screen.getByRole('link', {name:'View approved feedback for Statistical investigation'}))
      .toHaveAttribute('href','/student/grades?module=module');
  });

  it('keeps the compact verified summary readable at zoomed mobile text sizes', async () => {
    dashboard();
    await screen.findByText('78/100');
    const overview=screen.getByText('Approved Average').closest('dl');
    expect(overview?.className).toContain('auto-fit');
    expect(overview?.className).toContain('minmax(min(100%,8rem),1fr)');
  });

  it('does not show partially verified grades when the assessment metadata request fails', async () => {
    failure = 'unipathway_assessment_briefs'; dashboard();
    expect(await screen.findByText('Secure approved grades are unavailable.')).toBeInTheDocument();
    expect(screen.queryByText('78/100')).not.toBeInTheDocument();
    expect(screen.queryByText('Statistical investigation')).not.toBeInTheDocument();
    expect(screen.queryByText('No independently released grades yet')).not.toBeInTheDocument();
  });

  it('discards a delayed released-grade title after the active role changes', async () => {
    let release: () => void;
    delay = { table: 'unipathway_assessment_briefs', pending: new Promise(resolve => { release = resolve; }) };
    const view = dashboard();
    await waitFor(() => expect(mock.from).toHaveBeenCalledWith('unipathway_assessment_briefs'));
    mock.user = { ...mock.user, role: 'lecturer', roles: ['student', 'lecturer'] };
    view.rerender(<MemoryRouter><StudentDashboard /></MemoryRouter>);
    await screen.findByRole('alert');
    await act(async () => { release!(); });
    expect(screen.queryByText('Statistical investigation')).not.toBeInTheDocument();
    expect(screen.queryByText('78/100')).not.toBeInTheDocument();
  });
});
