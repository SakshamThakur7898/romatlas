import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Pause, Play, Search } from 'lucide-react';
import { apiGet } from '../lib/api';
import { useAuth } from '../lib/auth';
import { usePageMeta, useSearchStore } from '../lib/hooks';
import type { PublicStats } from '../lib/types';

const VIDEO_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260928_144832_2b6b23aa-4416-4fcb-9df4-132349c59edc.mp4';

function Stat({ value, label }: { value?: number; label: string }) {
  return (
    <div className="border-l border-line pl-4">
      <p className="font-mono text-3xl">{value === undefined ? '—' : value.toLocaleString()}</p>
      <p className="mt-1 font-mono text-xs tracking-widest text-muted">{label}</p>
    </div>
  );
}

/** Eight-point compass rose in a double ring. Uses currentColor so it follows the theme. */
function CompassMark() {
  return (
    <svg className="scene__mark" viewBox="0 0 64 64" role="img" aria-label="ROMAtlas compass">
      <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="32" cy="32" r="25.5" fill="none" stroke="currentColor" strokeWidth=".8" opacity=".5" />
      <g fill="currentColor" opacity=".85">
        <path d="M32 32 L46 18 L35.2 34.4 Z" />
        <path d="M32 32 L46 46 L29.6 35.2 Z" />
        <path d="M32 32 L18 46 L28.8 29.6 Z" />
        <path d="M32 32 L18 18 L34.4 28.8 Z" />
      </g>
      <g stroke="currentColor" strokeWidth="1" strokeLinejoin="round">
        <path d="M32 8 L35.5 28.5 L32 32 Z" fill="currentColor" />
        <path d="M32 8 L28.5 28.5 L32 32 Z" fill="none" />
        <path d="M56 32 L35.5 35.5 L32 32 Z" fill="currentColor" />
        <path d="M56 32 L35.5 28.5 L32 32 Z" fill="none" />
        <path d="M32 56 L28.5 35.5 L32 32 Z" fill="currentColor" />
        <path d="M32 56 L35.5 35.5 L32 32 Z" fill="none" />
        <path d="M8 32 L28.5 28.5 L32 32 Z" fill="currentColor" />
        <path d="M8 32 L28.5 35.5 L32 32 Z" fill="none" />
      </g>
      <circle cx="32" cy="32" r="1.8" fill="var(--paper)" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/**
 * Plays the scene while it is visible. Visitors whose system asks for reduced motion (on Windows this includes
 * "Animation effects" being switched off) get a paused first frame, and a visible Play button to opt in.
 * If the browser blocks autoplay, the button shows Play instead of silently leaving a still image.
 */
function useSceneVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const userPaused = useRef(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = true; // React sets this as a property only; some browsers need it before autoplay
    video.setAttribute('muted', '');
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      userPaused.current = true;
      video.removeAttribute('autoplay');
      video.pause();
    } else {
      video.play().catch(() => undefined);
    }

    let io: IntersectionObserver | undefined;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !userPaused.current) video.play().catch(() => undefined);
          else if (!entry.isIntersecting) video.pause();
        },
        { threshold: 0.15 },
      );
      io.observe(video);
    }
    return () => {
      io?.disconnect();
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, []);

  const toggle = () => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      userPaused.current = false;
      video.play().catch(() => undefined);
    } else {
      userPaused.current = true;
      video.pause();
    }
  };
  return { ref, playing, toggle };
}

export default function Home() {
  usePageMeta('ROMAtlas', 'Find ROMs, recoveries, guides and device compatibility from source-linked information.');
  const setOpen = useSearchStore((s) => s.setOpen);
  const user = useAuth((s) => s.user);
  const { ref: videoRef, playing, toggle } = useSceneVideo();
  const { data } = useQuery({ queryKey: ['stats'], queryFn: () => apiGet<PublicStats>('/stats') });

  return (
    <main>
      <section className="scene" aria-label="ROMAtlas">
        <video
          ref={videoRef}
          className="scene__video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
          disablePictureInPicture
        >
          <source src={VIDEO_URL} type="video/mp4" />
        </video>

        <div className="scene__content">
          <CompassMark />
          <h1 className="scene__brand">romatlas</h1>
          <p className="scene__tagline">The Android ecosystem, organized. Source-linked ROMs, recoveries and guides.</p>
          <button className="scene__search" onClick={() => setOpen(true)}>
            <Search size={15} aria-hidden /> Search your device, codename or model…
          </button>
          <nav className="scene__nav" aria-label="Home">
            <ul>
              <li><Link to="/devices">Devices</Link></li>
              <li><Link to="/roms">ROMs</Link></li>
              <li><Link to="/guides">Guides</Link></li>
              <li><Link to="/assistant">Assistant</Link></li>
              <li>{user ? <Link to="/account">Account</Link> : <Link to="/login">Sign in</Link>}</li>
            </ul>
          </nav>
          <p className="scene__copy">© {new Date().getFullYear()} ROMAtlas. Links to original sources; hosts no ROM files.</p>
        </div>

        <button className="scene__toggle" onClick={toggle} aria-label={playing ? 'Pause animation' : 'Play animation'}>
          {playing ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />}
          {!playing && <span>Play</span>}
        </button>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 md:grid-cols-4" aria-label="Index statistics">
        <Stat value={data?.devices} label="DEVICES" />
        <Stat value={data?.roms} label="ROM PROJECTS" />
        <Stat value={data?.guides} label="GUIDES" />
        <Stat value={data?.sources} label="SOURCES TRACKED" />
      </section>
    </main>
  );
}
