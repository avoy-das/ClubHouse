import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';

const Footer = () => {
    return (
        <footer data-testid="app-footer" className="bg-[#f5f3ee] border-t border-[#e4e2dd] text-[#444748] mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {/* Top Section: Brand, Nav Links, Social Icons */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6">
                    {/* Left: Brand Logo & Title */}
                    <Link to="/dashboard" className="flex items-center gap-2.5 group">
                        <div className="w-8 h-8 bg-[#1c1b1b] rounded-full flex items-center justify-center text-white font-extrabold text-sm shadow-xs group-hover:bg-[#30312e] transition-colors">
                            <Building2 className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-[#1c1b1b] font-extrabold text-lg tracking-tight font-heading">
                            ClubHouse
                        </span>
                    </Link>

                    {/* Center: Standard Footer Links */}
                    <nav aria-label="Footer Navigation" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-[#5c5f62]">
                        <a href="https://github.com/avoy-das/ClubHouse" target="_blank" rel="noopener noreferrer" className="hover:text-[#1b1c19] transition-colors">
                            Terms
                        </a>
                        <a href="https://github.com/avoy-das/ClubHouse" target="_blank" rel="noopener noreferrer" className="hover:text-[#1b1c19] transition-colors">
                            Privacy
                        </a>
                        <a href="https://github.com/avoy-das/ClubHouse" target="_blank" rel="noopener noreferrer" className="hover:text-[#1b1c19] transition-colors">
                            Security
                        </a>
                        <a href="https://github.com/avoy-das/ClubHouse" target="_blank" rel="noopener noreferrer" className="hover:text-[#1b1c19] transition-colors">
                            Status
                        </a>
                        <a href="https://github.com/avoy-das/ClubHouse" target="_blank" rel="noopener noreferrer" className="hover:text-[#1b1c19] transition-colors">
                            Docs
                        </a>
                        <a href="https://github.com/avoy-das/ClubHouse" target="_blank" rel="noopener noreferrer" className="hover:text-[#1b1c19] transition-colors">
                            Contact
                        </a>
                    </nav>

                    {/* Right: Social Media Links */}
                    <div className="flex items-center gap-3.5 text-[#1b1c19]">
                        {/* Facebook */}
                        <a
                            href="https://facebook.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Facebook"
                            className="p-1.5 hover:text-[#5c5f62] hover:bg-[#eae8e3] rounded-full transition-colors"
                        >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.891h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                            </svg>
                        </a>

                        {/* YouTube */}
                        <a
                            href="https://youtube.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="YouTube"
                            className="p-1.5 hover:text-[#5c5f62] hover:bg-[#eae8e3] rounded-full transition-colors"
                        >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                            </svg>
                        </a>

                        {/* Twitter / X */}
                        <a
                            href="https://twitter.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Twitter"
                            className="p-1.5 hover:text-[#5c5f62] hover:bg-[#eae8e3] rounded-full transition-colors"
                        >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                        </a>

                        {/* Instagram */}
                        <a
                            href="https://instagram.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Instagram"
                            className="p-1.5 hover:text-[#5c5f62] hover:bg-[#eae8e3] rounded-full transition-colors"
                        >
                            <svg className="w-4 h-4 stroke-current fill-none stroke-2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                            </svg>
                        </a>
                    </div>
                </div>

                {/* Bottom Section: Copyright & Subtext */}
                <div className="border-t border-[#e4e2dd] pt-6 text-center text-xs text-[#75777a] space-y-1">
                    <p className="font-medium">
                        &copy; {new Date().getFullYear()} ClubHouse. All Rights Reserved.
                    </p>
                    <p className="text-[11px] text-[#8e9094]">
                        Built for NSTU Student Clubs and Communities
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
