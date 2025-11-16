import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, BookOpen, Pause, Play, Sparkles } from 'lucide-react';
import NavBar from './NavBar';

// Waveform visualization component
const Waveform: React.FC<{ currentTime: number; duration: number }> = ({
  currentTime,
  duration,
}) => {
  // Heights for the waveform bars (matching the design pattern)
  const barHeights = [
    19.195, 27.492, 34.602, 39.844, 42.688, 42.773, 39.977, 34.406, 26.406,
    16.508, 12, 12, 17.102, 26.914, 34.789, 40.211, 42.844, 42.594, 39.609,
    34.242, 27.055, 18.711, 12, 12, 12, 12, 20.164, 28.359, 35.289, 40.289,
    42.836, 42.602, 39.484, 33.625,
  ];

  const progress = duration > 0 ? currentTime / duration : 0;
  const activeBars = Math.floor(progress * barHeights.length);

  return (
    <div className="flex gap-[3px] items-center justify-center h-[48px]">
      {barHeights.map((height, index) => (
        <div
          key={index}
          className={`rounded-full w-[3px] ${
            index < activeBars ? 'bg-[#8200db]' : 'bg-neutral-200'
          }`}
          style={{ height: `${height}px` }}
        />
      ))}
    </div>
  );
};

export const Entry: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const storyRef = useRef<HTMLParagraphElement | null>(null);
  const [story, setStory] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [showFullStory, setShowFullStory] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  // const getIdFromQuery = () => {
  //   const q = new URLSearchParams(location.search);
  //   return q.get('id');
  // };

  const getIdFromQuery = useCallback(() => {
    const q = new URLSearchParams(location.search);
    return q.get('id');
  }, [location.search]);

  useEffect(() => {
    const id = getIdFromQuery();
    if (!id) {
      setError('No story id provided');
      setLoading(false);
      return;
    }

    const fetchStory = async () => {
      setLoading(true);
      setError(null);
      try {
        const base =
          (import.meta as any).env.VITE_BACKEND_URL ?? 'http://localhost:3000';
        const res = await fetch(`${base}/stories/${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setStory(data);
      } catch (err: any) {
        console.error('Failed to load story', err);
        setError(err?.message ?? String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchStory();
  }, [getIdFromQuery, location.search]);

  useEffect(() => {
    if (storyRef.current) {
      const { scrollHeight, clientHeight } = storyRef.current;
      if (scrollHeight > clientHeight) {
        setIsOverflowing(true);
      }
    }
  }, [story]);

  const handleBack = () => {
    navigate('/journal');
  };

  const handleReadFullStory = () => {
    setShowFullStory(true);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  // audio time state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime || 0);
    const onDuration = () => setDuration(audio.duration || 0);
    const onEnded = () => setPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onDuration);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, [story?.audioUrl]);

  return (
    <div className="bg-[#f9e9ff] min-h-screen flex items-center justify-center p-4">
      <div
        className="rounded-[24px] pb-8 w-full max-w-[448px] flex flex-col shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
        style={{
          background:
            'linear-gradient(135deg, #FAF5FF 0%, #FDF2F8 50%, rgba(253, 242, 248, 0.00) 100%)',
        }}
      >
        {/* Header with back button */}
        <div className="border-b border-[#d1d1d1] px-4 py-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          >
            <ArrowLeft className="size-5 text-neutral-600" />
            <span className="font-sans font-normal leading-[20px] text-[14px] text-neutral-600 tracking-[-0.1504px]">
              Back to stories
            </span>
          </button>
        </div>

        {/* Story Content */}
        <div className="flex flex-col gap-4 px-6 pt-6">
          {loading && (
            <p className="text-sm text-neutral-500">Loading story…</p>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {!loading && !error && story && (
            <>
              {/* Title and Date */}
              <div className="flex flex-col gap-1">
                <h1 className="font-sans font-semibold leading-[24px] text-[16px] text-neutral-900 tracking-[-0.3125px]">
                  {story.title ?? 'Untitled'}
                </h1>
                <p className="font-sans font-normal leading-[20px] text-[14px] text-[#a1a1a1] tracking-[-0.1504px]">
                  {story.createdAt
                    ? new Date(story.createdAt).toLocaleString()
                    : ''}
                </p>
              </div>

              {/* Story Text Full */}
              <p
                ref={storyRef}
                className={`font-sans font-normal leading-[26px] text-[16px] text-neutral-700 tracking-[-0.3125px] whitespace-pre-line ${
                  !showFullStory && isOverflowing ? 'line-clamp-6' : ''
                }`}
              >
                {story.story}
              </p>

              {/* Read Full Story Button */}
              {isOverflowing && !showFullStory && (
                <button
                  onClick={handleReadFullStory}
                  className="bg-[#8200db] h-[48px] rounded-full w-full flex items-center justify-center gap-2 hover:bg-[#6d00b8] transition-colors"
                  style={{
                    boxShadow:
                      '0px 10px 15px -3px #e9d4ff, 0px 4px 6px -4px #e9d4ff',
                  }}
                >
                  <BookOpen className="size-4 text-white" />
                  <span className="font-sans font-medium leading-[20px] text-[14px] text-white tracking-[-0.1504px]">
                    Read full story
                  </span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Audio Player Section */}
        <div className="flex flex-col gap-3 px-6 py-0 mt-8">
          <p className="font-sans font-normal leading-[20px] text-[14px] text-neutral-500 tracking-[-0.1504px]">
            Listen to the story
          </p>

          <div className="flex flex-col gap-3">
            {/* Play Button and Waveform */}
            <div className="flex gap-2 items-center">
              <button
                onClick={togglePlay}
                className="bg-[#8200db] rounded-full size-[48px] flex items-center justify-center shrink-0 hover:bg-[#6d00b8] transition-colors"
                style={{
                  boxShadow:
                    '0px 10px 15px -3px #e9d4ff, 0px 4px 6px -4px #e9d4ff',
                }}
              >
                {playing ? (
                  <Pause className="size-5 text-white fill-white" />
                ) : (
                  <Play className="size-5 text-white fill-white" />
                )}
              </button>
              <div className="flex-1">
                <Waveform currentTime={currentTime} duration={duration} />
              </div>
            </div>

            {/* hidden audio element */}
            {story?.audioUrl && (
              <audio
                ref={audioRef}
                src={story.audioUrl}
                preload="metadata"
                style={{ display: 'none' }}
              />
            )}

            {/* Time Stamps */}
            <div className="flex justify-between px-1">
              <span className="font-sans font-normal leading-[16px] text-[12px] text-[#a1a1a1]">
                {new Date((currentTime || 0) * 1000)
                  .toISOString()
                  .substr(14, 5)}
              </span>
              <span className="font-sans font-normal leading-[16px] text-[12px] text-[#a1a1a1]">
                {new Date((duration || 0) * 1000).toISOString().substr(14, 5)}
              </span>
            </div>
          </div>
        </div>

        {/* Image Section */}
        {story?.imageUrl && (
          <div className="flex flex-col gap-3 px-6 py-0 mt-8">
            {/* Caption and Badge */}
            <div className="flex items-center justify-between">
              <p className="font-sans font-normal leading-[20px] text-[14px] text-neutral-700 tracking-[-0.1504px]">
                {story.title ?? 'AI generated image'}
              </p>
              <div className="bg-neutral-100 border border-transparent rounded-[8px] h-[22px] px-2 flex items-center gap-1.5">
                <Sparkles className="size-3 text-neutral-500" />
                <span className="font-sans font-medium leading-[16px] text-[12px] text-neutral-500">
                  AI generated
                </span>
              </div>
            </div>

            {/* Image */}
            <div className="bg-neutral-900 rounded-[14px] h-[300px] w-full overflow-hidden">
              <img
                src={story.imageUrl}
                alt={story.title ?? 'AI generated image'}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}
        <div className="mt-8">
          <NavBar />
        </div>
      </div>
    </div>
  );
};

export default Entry;
