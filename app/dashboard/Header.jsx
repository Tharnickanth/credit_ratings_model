import React from 'react';
import { Settings } from 'lucide-react';

const Header = () => {
  return (
    <div className="bg-white shadow-sm border-b border-gray-200 px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-gray-600">Account</span>
        <span className="text-gray-600">Dropdown</span>
        <button className="text-gray-600 hover:text-gray-800">Log out</button>
      </div>
    </div>
  );
};

export default Header;