import { Facebook, Instagram, Twitter } from "@/components/ui/icon";
import { Link } from "wouter";

const Footer = () => {
  const navItems = [
    { href: "/", label: "Home" },
    { href: "/clinical-notes", label: "Clinical Notes" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
  ];

  const socialLinks = [
    { icon: <Facebook className="h-5 w-5" />, label: "Facebook", href: "#" },
    { icon: <Instagram className="h-5 w-5" />, label: "Instagram", href: "#" },
    { icon: <Twitter className="h-5 w-5" />, label: "Twitter", href: "#" },
  ];

  return (
    <footer className="bg-white">
      <div className="max-w-7xl mx-auto py-12 px-4 overflow-hidden sm:px-6 lg:px-8">
        <nav
          className="-mx-5 -my-2 flex flex-wrap justify-center"
          aria-label="Footer"
        >
          {navItems.map((item) => (
            <div key={item.label} className="px-5 py-2">
              <Link href={item.href}>
                <span className="text-base text-neutral-500 hover:text-neutral-900 cursor-pointer">
                  {item.label}
                </span>
              </Link>
            </div>
          ))}
        </nav>

        <div className="mt-8 flex justify-center space-x-6">
          {socialLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-neutral-400 hover:text-neutral-500"
            >
              <span className="sr-only">{item.label}</span>
              {item.icon}
            </a>
          ))}
        </div>

        <p className="mt-8 text-center text-base text-neutral-400">
          &copy; {new Date().getFullYear()} PhysioAI, Inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
