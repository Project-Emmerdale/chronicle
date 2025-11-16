import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2, Play, User } from 'lucide-react';

interface StoryButtonProps {
  title: string;
  icon: React.ReactNode;
  onClick?: () => void;
  variant?: 'purple' | 'pink';
}

const StoryButton: React.FC<StoryButtonProps> = ({
  title,
  icon,
  onClick,
  variant = 'purple',
}) => {
  const shadowColor = variant === 'purple' ? '#e9d4ff' : '#fccee8';
  const buttonBg = variant === 'purple' ? 'bg-[#8200db]' : 'bg-[#c6005c]';

  return (
    <button
      onClick={onClick}
      className="bg-[rgba(255,255,255,0.8)] border border-[#F3E8FF] border-solid h-[90px] rounded-[16px] w-full flex items-center justify-between px-[21px] hover:bg-white transition-colors"
    >
      <p className="font-sans font-normal leading-[24px] text-[16px] text-neutral-900 tracking-[-0.3125px] text-left">
        {title}
      </p>
      <div
        className={`${buttonBg} rounded-full size-[48px] flex items-center justify-center shrink-0`}
        style={{
          boxShadow: `0px 10px 15px -3px ${shadowColor}, 0px 4px 6px -4px ${shadowColor}`,
        }}
      >
        {icon}
      </div>
    </button>
  );
};

interface StorySectionProps {
  title: string;
  titleColor: string;
  icon: React.ReactNode;
  stories: Array<{ title: string; icon: React.ReactNode }>;
  onStoryClick?: () => void;
  variant?: 'purple' | 'pink';
}

const StorySection: React.FC<StorySectionProps> = ({
  title,
  titleColor,
  icon,
  stories,
  onStoryClick,
  variant = 'purple',
}) => {
  return (
    <div className="flex flex-col gap-[12px] w-full">
      <div className="flex gap-[8px] items-center">
        {icon}
        <h2
          className={`font-sans font-normal leading-[20px] text-[15px] ${titleColor} tracking-[-0.1504px]`}
        >
          {title}
        </h2>
      </div>
      <div className="flex flex-col gap-[8px]">
        {stories.map((story, index) => (
          <StoryButton
            key={index}
            title={story.title}
            icon={story.icon}
            onClick={onStoryClick}
            variant={variant}
          />
        ))}
      </div>
    </div>
  );
};

export const WelcomeScreen: React.FC = () => {
  const navigate = useNavigate();

  const sharableStories = [
    {
      title: 'Tell us about a cosmic adventure!',
      icon: <Play className="size-4 text-white" />,
    },
    {
      title: 'Share a fond memory with Lotta!',
      icon: <Play className="size-4 text-white" />,
    },
  ];

  const personalReflections = [
    {
      title: "Did you feel relaxed after today's group yoga?",
      icon: <Play className="size-4 text-white" />,
    },
    {
      title: 'How do you feel about the upcoming weekend?',
      icon: <Play className="size-4 text-solid-white" />,
    },
  ];

  const handleStoryClick = () => {
    navigate('/chat');
  };

  const handleJournalClick = () => {
    navigate('/journal');
  };

  return (
    <div className=" min-h-screen flex items-center justify-center p-4">
      <div
        className="rounded-[24px] w-full max-w-[448px] flex flex-col shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
        style={{
          background:
            'linear-gradient(135deg, #FAF5FF 0%, #FDF2F8 50%, rgba(253, 242, 248, 0.00) 100%)',
        }}
      >
        <div className="flex flex-col gap-[24px] pt-[33px] px-[33px] pb-[33px]">
          {/* Header */}
          <div className="flex flex-col items-center gap-[16px]">
            <div className="rounded-full w-[80px] h-[80px] shadow-[0px_0px_0px_4px_#f3e8ff,0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] overflow-hidden">
              <img
                src="/marja_pfp.jpeg"
                alt="Marja"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col gap-[8px] items-center">
              <p className="font-sans font-normal leading-[24px] text-[16px] text-neutral-700 tracking-[-0.3125px] text-center">
                Good evening, Marja 👋
              </p>
              <p className="font-sans font-medium leading-[36px] text-[22px] text-neutral-900 tracking-[0.0703px] text-center">
                What shall we talk about today?
              </p>
            </div>
          </div>

          {/* Sharable Stories Section */}
          <div className="flex flex-col gap-[24px] mt-2">
            <StorySection
              title="Sharable stories"
              titleColor="text-[#8200db]"
              icon={<Share2 className="size-4 text-[#8200db]" />}
              stories={sharableStories}
              onStoryClick={handleStoryClick}
              variant="purple"
            />

            {/* Personal Reflections Section */}
            <StorySection
              title="Personal reflections"
              titleColor="text-[#c6005c]"
              icon={<User className="size-4 text-[#c6005c]" />}
              stories={personalReflections}
              onStoryClick={handleStoryClick}
              variant="pink"
            />
          </div>
          <button
            onClick={handleJournalClick}
            className="h-9 rounded-[8px] w-full flex items-center justify-center hover:bg-neutral-50 transition-colors"
          >
            <span className="font-sans font-medium leading-[20px] text-[14px] text-neutral-600 tracking-[-0.1504px]">
              View journal
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
