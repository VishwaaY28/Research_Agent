import React from 'react';
import { FiGithub } from 'react-icons/fi';

const Footer: React.FC = () => (
  <footer className="bg-white border-t border-gray-200 py-8 mt-16">
    <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between">
      <div className="text-neutral-600 text-sm">
        © {new Date().getFullYear()} Proposal Craft. All rights reserved.
      </div>
      <div className="flex items-center gap-4 mt-4 md:mt-0">
        <a
          href="https://github.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-400 hover:text-primary transition"
        >
          <FiGithub className="w-5 h-5" />
        </a>
        <span className="text-neutral-400">|</span>
        <a href="/privacy" className="text-neutral-400 hover:text-primary transition text-sm">
          Privacy Policy
        </a>
        <a href="/terms" className="text-neutral-400 hover:text-primary transition text-sm ml-4">
          Terms
        </a>
      </div>
    </div>
  </footer>
);

export default Footer;
