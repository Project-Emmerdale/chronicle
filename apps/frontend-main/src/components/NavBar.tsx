import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Book, Plus } from 'lucide-react';

const NavBar: React.FC = () => {
  const location = useLocation();

  const getLinkClass = (path: string) => {
    return location.pathname === path
      ? 'flex items-center gap-2 text-[#8200db]'
      : 'flex items-center gap-2 text-neutral-500 hover:text-neutral-700 transition-colors';
  };

  return (
    <nav className="bg-white shadow-md rounded-full px-6 py-3 flex justify-around items-center w-full max-w-[90%] mx-auto">
      <Link to="/journal" className={getLinkClass('/journal')}>
        <Book className="size-5" />
        <span className="font-medium">Journal</span>
      </Link>
      <Link to="/chat" className={getLinkClass('/chat')}>
        <Plus className="size-5" />
        <span className="font-medium">New Chat</span>
      </Link>
    </nav>
  );
};

export default NavBar;
