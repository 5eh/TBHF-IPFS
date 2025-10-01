import { FileText, Github } from "lucide-react";

export function Footer() {
  const externalLinks = [
    {
      href: "https://docs.tbhn.org",
      label: "Docs",
      icon: FileText,
    },
    {
      href: "https://github.com/tbhf",
      label: "GitHub",
      icon: Github,
    },
  ];

  return (
    <footer className=" mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="text-gray-500 text-sm">
            The Black History Foundation
          </div>

          <div className="flex items-center gap-6">
            {externalLinks.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </a>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-6 ">
          <div className="text-xs text-gray-600">
            Powered by IPFS & Ethereum
          </div>
        </div>
      </div>
    </footer>
  );
}
