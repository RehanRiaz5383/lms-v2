import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tooltip } from '../components/ui/tooltip';
import {
  Video,
  Eye,
  ExternalLink,
  Loader2,
  FileArchive,
  BookOpen,
  Layers,
  PlayCircle,
  ChevronRight,
  ChevronDown,
  Search,
  X,
} from 'lucide-react';
import { apiService } from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import { openInternalVideo } from '../utils/videoPlayback';
import { useToast } from '../components/ui/toast';
import { cn } from '../utils/cn';

/**
 * Group flat API rows into batch → subject buckets for structured browsing.
 */
function groupVideosByBatchSubject(videoList) {
  const map = new Map();
  for (const v of videoList) {
    const batchId = v.batch_id ?? 'unknown';
    const subjectId = v.subject_id ?? 'unknown';
    const key = `${batchId}:${subjectId}`;
    if (!map.has(key)) {
      map.set(key, {
        batchId: v.batch_id,
        batchTitle: v.batch_title || 'Batch',
        subjectId: v.subject_id,
        subjectTitle: v.subject_title || 'Subject',
        videos: [],
      });
    }
    map.get(key).videos.push(v);
  }
  const groups = Array.from(map.values());
  groups.forEach((g) => {
    g.videos.sort((a, b) => {
      const sa = a.sort_order ?? 999999;
      const sb = b.sort_order ?? 999999;
      if (sa !== sb) return sa - sb;
      return String(a.title || '').localeCompare(String(b.title || ''));
    });
  });
  groups.sort((a, b) => {
    const bt = String(a.batchTitle).localeCompare(String(b.batchTitle));
    if (bt !== 0) return bt;
    return String(a.subjectTitle).localeCompare(String(b.subjectTitle));
  });
  return groups;
}

/** Match title, description, batch name, and subject name (all tokens must appear, case-insensitive). */
function filterVideosByKeyword(videoList, rawKeyword) {
  const q = String(rawKeyword || '').trim().toLowerCase();
  if (!q) return videoList;
  const tokens = q.split(/\s+/).filter(Boolean);
  return videoList.filter((v) => {
    const hay = [v.title, v.short_description, v.batch_title, v.subject_title]
      .map((x) => String(x || '').toLowerCase())
      .join(' ');
    return tokens.every((t) => hay.includes(t));
  });
}

const StudentLectureVideos = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { error: showError } = useToast();
  const [videos, setVideos] = useState([]);
  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  /** Group keys `${batchId}-${subjectId}` that are expanded. Empty = all accordions closed on first visit. */
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());

  const sectionKey = (batchId, subjectId) => `${batchId}-${subjectId}`;

  const toggleGroupExpanded = (batchId, subjectId) => {
    const key = sectionKey(batchId, subjectId);
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    const b = searchParams.get('batch_id');
    const s = searchParams.get('subject_id');
    if (b) setSelectedBatch(b);
    if (s) setSelectedSubject(s);
  }, [searchParams]);

  /* Deep link: open the matching section */
  useEffect(() => {
    const b = searchParams.get('batch_id');
    const s = searchParams.get('subject_id');
    if (!b || !s) return;
    const key = sectionKey(b, s);
    setExpandedGroups((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, [searchParams]);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedBatch) params.batch_id = selectedBatch;
      if (selectedSubject) params.subject_id = selectedSubject;

      const response = await apiService.get(API_ENDPOINTS.student.videos.list, { params });
      setVideos(response.data.data.videos || []);
      setBatches(response.data.data.batches || []);
      setSubjects(response.data.data.subjects || []);
    } catch (err) {
      showError('Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, [selectedBatch, selectedSubject]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const filteredVideos = useMemo(
    () => filterVideosByKeyword(videos, keyword),
    [videos, keyword]
  );

  const grouped = useMemo(() => groupVideosByBatchSubject(filteredVideos), [filteredVideos]);

  const keywordTrimmed = keyword.trim();
  const isSearchActive = keywordTrimmed.length > 0;

  /* When searching, open every section that still has matches so results are visible immediately. */
  useEffect(() => {
    if (!keywordTrimmed) return;
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      let added = false;
      grouped.forEach((g) => {
        const k = sectionKey(g.batchId, g.subjectId);
        if (!next.has(k)) {
          next.add(k);
          added = true;
        }
      });
      return added ? next : prev;
    });
  }, [keywordTrimmed, grouped]);

  const batchFromUrl = searchParams.get('batch_id');
  const subjectFromUrl = searchParams.get('subject_id');

  useEffect(() => {
    if (!batchFromUrl || !subjectFromUrl || loading || videos.length === 0) return;
    const el = document.getElementById(`course-${batchFromUrl}-${subjectFromUrl}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [batchFromUrl, subjectFromUrl, loading, videos.length, grouped.length]);

  const subjectOptions = useMemo(() => {
    if (!selectedBatch) return subjects;
    const ids = new Set(
      videos.filter((v) => String(v.batch_id) === String(selectedBatch)).map((v) => String(v.subject_id))
    );
    return subjects.filter((s) => ids.has(String(s.id)));
  }, [subjects, selectedBatch, videos]);

  const syncUrl = (batch, subject) => {
    const next = new URLSearchParams(searchParams);
    if (batch) next.set('batch_id', batch);
    else next.delete('batch_id');
    if (subject) next.set('subject_id', subject);
    else next.delete('subject_id');
    setSearchParams(next, { replace: true });
  };

  const handleBatchChange = (value) => {
    setSelectedBatch(value);
    setSelectedSubject('');
    syncUrl(value, '');
  };

  const handleSubjectChange = (value) => {
    setSelectedSubject(value);
    syncUrl(selectedBatch, value);
  };

  const clearFilters = () => {
    setSelectedBatch('');
    setSelectedSubject('');
    setKeyword('');
    setSearchParams({}, { replace: true });
  };

  const handleViewVideo = (video) => {
    if (!openInternalVideo(video)) {
      showError('Could not open video. Allow pop-ups for this site and try again.');
    }
  };

  const totalVideos = videos.length;
  const visibleVideoCount = filteredVideos.length;
  const batchCount = new Set(videos.map((v) => v.batch_id)).size;
  const subjectCount = new Set(videos.map((v) => `${v.batch_id}:${v.subject_id}`)).size;
  const isFiltered = Boolean(selectedBatch || selectedSubject || isSearchActive);

  return (
    <div className="space-y-8 pb-10">
      {/* Summary */}
      <div className="rounded-xl border border-border/80 bg-muted/30 px-5 py-4 sm:px-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading your lectures…</p>
        ) : totalVideos === 0 ? (
          <p className="text-sm text-muted-foreground">
            You don&apos;t have any lecture videos yet. They will show up here when your instructors assign
            them to your batch.
          </p>
        ) : (
          <>
            <p className="text-base text-foreground leading-relaxed sm:text-lg">
              You currently have <strong className="font-semibold text-foreground">{totalVideos}</strong>{' '}
              {totalVideos === 1 ? 'video' : 'videos'} across{' '}
              <strong className="font-semibold text-foreground">{subjectCount}</strong>{' '}
              {subjectCount === 1 ? 'subject' : 'subjects'}, and are enrolled in{' '}
              <strong className="font-semibold text-foreground">{batchCount}</strong>{' '}
              {batchCount === 1 ? 'batch' : 'batches'}.
            </p>
            {isSearchActive && visibleVideoCount !== totalVideos && (
              <p className="mt-2 text-sm text-muted-foreground">
                Search is showing <strong>{visibleVideoCount}</strong> of {totalVideos} video
                {totalVideos !== 1 ? 's' : ''}.
              </p>
            )}
          </>
        )}
      </div>

      {/* Filters — compact toolbar */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Find your course</CardTitle>
          <CardDescription>
            Search by keywords, or filter by batch and subject. Course sections start collapsed unless you
            search—then matching sections open automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="video-keyword">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="video-keyword"
                type="search"
                placeholder="Search titles, descriptions, batch or subject…"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-9 pr-9"
                autoComplete="off"
              />
              {keyword ? (
                <button
                  type="button"
                  onClick={() => setKeyword('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="flex-1 min-w-[200px] space-y-2">
              <Label htmlFor="batch">Batch</Label>
              <select
                id="batch"
                value={selectedBatch}
                onChange={(e) => handleBatchChange(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">All my batches</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={String(batch.id)}>
                    {batch.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px] space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <select
                id="subject"
                value={selectedSubject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                disabled={selectedBatch ? subjectOptions.length === 0 : false}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <option value="">{selectedBatch ? 'All subjects in this batch' : 'All subjects'}</option>
                {(selectedBatch ? subjectOptions : subjects).map((subject) => (
                  <option key={subject.id} value={String(subject.id)}>
                    {subject.title}
                  </option>
                ))}
              </select>
            </div>
            {isFiltered && (
              <Button type="button" variant="outline" className="shrink-0" onClick={clearFilters}>
                Clear all
              </Button>
            )}
          </div>
          {isFiltered && (
            <p className="text-sm text-muted-foreground">
              {isSearchActive && (
                <>
                  Showing videos that match &ldquo;{keywordTrimmed}&rdquo;.
                  {visibleVideoCount === 0 && ' Try different words or clear the search.'}{' '}
                </>
              )}
              {(selectedBatch || selectedSubject) && !isSearchActive && <>Showing filtered results. </>}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={clearFilters}
              >
                Reset
              </button>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-20">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading your lecture videos…</p>
        </div>
      ) : videos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="rounded-full bg-muted p-4">
              <Video className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-foreground">No videos yet</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              When your instructors publish videos for your batch and subjects, they will appear here,
              organized by course.
            </p>
          </CardContent>
        </Card>
      ) : grouped.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="rounded-full bg-muted p-4">
              <Search className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-foreground">No matching videos</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Nothing matches &ldquo;{keywordTrimmed}&rdquo;. Try other keywords, or clear the search to see
              everything again.
            </p>
            <Button type="button" variant="outline" className="mt-4" onClick={() => setKeyword('')}>
              Clear search
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => {
            const sk = sectionKey(group.batchId, group.subjectId);
            const expanded = expandedGroups.has(sk);

            return (
              <section
                key={sk}
                className="scroll-mt-24 rounded-xl border border-border/80 bg-card/30"
                id={`course-${group.batchId}-${group.subjectId}`}
              >
                <button
                  type="button"
                  onClick={() => toggleGroupExpanded(group.batchId, group.subjectId)}
                  aria-expanded={expanded}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-t-xl border-b border-border/60 px-4 py-3 text-left transition-colors',
                    'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                  )}
                >
                  <ChevronDown
                    className={cn(
                      'mt-0.5 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200',
                      !expanded && '-rotate-90'
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded-md bg-primary/12 px-2 py-0.5 text-primary">
                        <Layers className="h-3 w-3" />
                        {group.batchTitle}
                      </span>
                      <ChevronRight className="h-3 w-3 opacity-40" />
                      <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-secondary-foreground">
                        <BookOpen className="h-3 w-3" />
                        {group.subjectTitle}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      <span className="font-medium text-foreground">{group.subjectTitle}</span>
                      <span className="mx-1.5 text-border">·</span>
                      <span>{group.batchTitle}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {group.videos.length} lesson{group.videos.length !== 1 ? 's' : ''}
                      {!expanded ? ' · tap to expand' : ''}
                    </p>
                  </div>
                </button>

                {expanded && (
                  <div className="p-3 sm:p-4">
                    <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      {group.videos.map((video, idx) => (
                        <Card
                          key={video.id}
                          className={cn(
                            'group flex flex-col overflow-hidden border-border/80 shadow-sm transition-shadow hover:shadow-md',
                            'hover:border-primary/25'
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => handleViewVideo(video)}
                            aria-label={`Watch: ${video.title}`}
                            className={cn(
                              'relative h-20 w-full shrink-0 cursor-pointer overflow-hidden border-0 bg-gradient-to-br from-muted to-muted/50 p-0 text-left',
                              'transition-[filter,transform] hover:brightness-[0.97] active:brightness-90',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'
                            )}
                          >
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                              <div className="rounded-full bg-background/95 p-1.5 shadow-sm ring-1 ring-border transition-transform group-hover:scale-105">
                                <PlayCircle className="h-7 w-7 text-primary" />
                              </div>
                            </div>
                            <div className="pointer-events-none absolute bottom-1 left-1 right-1 flex flex-wrap items-center gap-1">
                              <span className="rounded bg-background/90 px-1.5 py-px text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                                L{idx + 1}
                              </span>
                              {video.source_type === 'internal' ? (
                                <span className="rounded bg-blue-500/15 px-1.5 py-px text-[9px] font-medium text-blue-600 dark:text-blue-400">
                                  Hosted
                                </span>
                              ) : (
                                <span className="rounded bg-amber-500/15 px-1.5 py-px text-[9px] font-medium text-amber-700 dark:text-amber-400">
                                  Link
                                </span>
                              )}
                            </div>
                          </button>
                          <CardHeader className="flex-1 space-y-1.5 px-3 pb-0 pt-2">
                            <CardTitle className="line-clamp-2 text-sm font-semibold leading-snug">
                              {video.title}
                            </CardTitle>
                            {video.short_description ? (
                              <CardDescription className="line-clamp-2 text-xs leading-relaxed">
                                {video.short_description}
                              </CardDescription>
                            ) : (
                              <CardDescription className="line-clamp-2 text-xs italic text-muted-foreground/85">
                                Open to watch this lecture.
                              </CardDescription>
                            )}
                          </CardHeader>
                          <CardContent className="mt-auto flex flex-wrap gap-1.5 px-3 pb-3 pt-2">
                            <Button
                              size="sm"
                              className="h-8 gap-1 px-2.5 text-xs"
                              onClick={() => handleViewVideo(video)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Watch
                            </Button>
                            {video.source_type === 'external' && video.external_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1 px-2.5 text-xs"
                                onClick={() => window.open(video.external_url, '_blank')}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Link
                              </Button>
                            )}
                            {video.resource && (
                              <Tooltip content={video.resource.original_name || 'Download resource'}>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-8 max-w-full gap-1 px-2.5 text-xs"
                                  onClick={() => window.open(video.resource.download_url, '_blank')}
                                >
                                  <FileArchive className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">ZIP</span>
                                </Button>
                              </Tooltip>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentLectureVideos;
