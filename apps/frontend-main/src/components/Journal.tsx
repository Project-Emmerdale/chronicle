import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import NavBar from './NavBar';

interface StoryEntry {
  id?: string;
  date: string | null;
  title: string;
  description: string;
  audioUrl?: string | null;
}

interface StoryEntryProps {
  entry: StoryEntry;
  isNew?: boolean;
  onClick?: () => void;
}

const StoryEntryCard: React.FC<StoryEntryProps> = ({
  entry,
  isNew,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className="bg-neutral-50 h-[128px] rounded-[14px] w-full flex items-center gap-4 px-4 hover:bg-neutral-100 transition-colors text-left"
    >
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <div
          className={`h-[16px] flex items-center gap-2 ${isNew ? 'mb-1' : ''}`}
        >
          {isNew && (
            <div className="bg-[#43af5e] h-[22px] rounded-[15px] w-[50px] flex items-center justify-center shrink-0 ">
              <p className="font-sans font-extrabold leading-[16px] text-[12px] text-white whitespace-nowrap">
                NEW
              </p>
            </div>
          )}
          <p className="font-sans font-normal leading-[16px] text-[12px] text-[#a1a1a1]">
            {entry.date}
          </p>
        </div>
        <p className="font-sans font-normal leading-[24px] text-[16px] text-neutral-900 tracking-[-0.3125px]">
          {entry.title}
        </p>
        <p className="font-sans font-normal leading-[20px] text-[14px] text-neutral-500 tracking-[-0.1504px] line-clamp-2">
          {entry.description}
        </p>
      </div>
      <div
        className="bg-[#8200db] rounded-full size-[48px] flex items-center justify-center shrink-0"
        style={{
          boxShadow: '0px 10px 15px -3px #e9d4ff, 0px 4px 6px -4px #e9d4ff',
        }}
      >
        <Play className="size-5 text-white fill-white" />
      </div>
    </button>
  );
};

export const Journal: React.FC = () => {
  const navigate = useNavigate();

  const [stories, setStories] = useState<StoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (iso: string | null) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  useEffect(() => {
    const fetchStories = async () => {
      setLoading(true);
      setError(null);
      try {
        const base =
          (import.meta as any).env.VITE_BACKEND_URL ?? 'http://localhost:3000';
        const res = await fetch(`${base}/stories`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const mapped: StoryEntry[] = (data || []).map((s: any) => ({
          id: s.id,
          date: formatDate(s.createdAt || null),
          title: s.title || 'Untitled',
          description: s.description || s.story || '',
          audioUrl: s.audioUrl || null,
        }));
        setStories(mapped);
      } catch (err: any) {
        console.error('Failed to load stories', err);
        setError(err?.message ?? String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchStories();
  }, []);

  const handleStoryClick = (story?: StoryEntry) => {
    // You might want to navigate to a specific entry route with id
    if (story?.id) {
      navigate(`/entry?id=${story.id}`);
    } else {
      navigate('/entry');
    }
  };

  return (
    <div className="bg-[#f9e9ff] min-h-screen flex items-center justify-center p-4">
      <div
        className="rounded-[24px] w-full max-w-[448px] flex flex-col shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
        style={{
          background:
            'linear-gradient(135deg, #FAF5FF 0%, #FDF2F8 50%, rgba(253, 242, 248, 0.00) 100%)',
        }}
      >
        <div className="flex flex-col gap-6 p-6">
          <div className="flex items-center justify-center gap-3">
            <img
              src="/marja_pfp.jpeg"
              alt="Marja"
              className="w-12 h-12 rounded-full object-cover "
            />
            <h1 className="font-sans font-thin leading-[36px] text-[20px] text-neutral-900 tracking-[0.0703px]">
              Marja's journal 📖
            </h1>
          </div>
          <div className="flex flex-col gap-4">
            {loading && (
              <p className="text-sm text-neutral-500">Loading stories…</p>
            )}
            {error && (
              <p className="text-sm text-red-500">
                Failed to load stories: {error}
              </p>
            )}
            {!loading && !error && stories.length === 0 && (
              <p className="text-sm text-neutral-500">No stories yet.</p>
            )}
            {stories.map((story, index) => (
              <StoryEntryCard
                key={story.id ?? index}
                entry={story}
                isNew={index === 0}
                onClick={() => handleStoryClick(story)}
              />
            ))}
          </div>
          <div className="mt-4">
            <NavBar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Journal;
