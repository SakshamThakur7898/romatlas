import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, BellOff, Bookmark, BookmarkCheck, Flag } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useBookmark, useFollow } from '../lib/userActions';
import { ApiError } from '../lib/api';
import { ReportDialog } from './ReportDialog';
import { buttonClass } from './ui';

/** Follow / bookmark / report controls for a device or ROM page. Anonymous users are sent to sign in. */
export function EntityActions({ kind, id, name }: { kind: 'device' | 'rom'; id: string; name: string }) {
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();
  const follow = useFollow(kind, id);
  const bookmark = useBookmark(kind === 'device' ? 'DEVICE' : 'ROM', id);
  const [reporting, setReporting] = useState(false);

  const guard = (fn: () => void) => () => {
    if (!user) navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
    else fn();
  };
  const error = follow.error ?? bookmark.error;

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-2">
        <button className={buttonClass} disabled={follow.pending} onClick={guard(follow.toggle)} aria-pressed={follow.active}>
          {follow.active ? <BellOff size={14} aria-hidden /> : <Bell size={14} aria-hidden />}
          {follow.active ? 'Following' : `Follow ${kind}`}
        </button>
        <button className={buttonClass} disabled={bookmark.pending} onClick={guard(bookmark.toggle)} aria-pressed={bookmark.active}>
          {bookmark.active ? <BookmarkCheck size={14} aria-hidden /> : <Bookmark size={14} aria-hidden />}
          {bookmark.active ? 'Bookmarked' : 'Bookmark'}
        </button>
        <button className={buttonClass} onClick={guard(() => setReporting(true))}>
          <Flag size={14} aria-hidden /> Report information
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-accent">{error instanceof ApiError ? error.message : 'Action failed.'}</p>}
      {reporting && <ReportDialog targetType={kind === 'device' ? 'DEVICE' : 'ROM'} targetId={id} label={name} onClose={() => setReporting(false)} />}
    </div>
  );
}
