"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

export function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Upload" },
    { href: "/artifacts", label: "Gallery" },
    { href: "/administrative", label: "Admin" },
  ];

  return (
    <nav className="pt-4">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center">
            <Image
              src="/Logo.png"
              alt="TBHF"
              width={120}
              height={32}
              className="h-8 w-auto"
            />
          </Link>

          <div className="flex items-center ">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 text-sm transition-colors ${
                  pathname === link.href
                    ? "text-white bg-stone-900 rounded-full"
                    : "text-gray-400 hover:text-white bg-stone-900 rounded-lg"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <appkit-button />
      </div>
    </nav>
  );
}
