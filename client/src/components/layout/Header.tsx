import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MedicalServices, Menu } from "@/components/ui/icon";

const Header = () => {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/clinical-notes", label: "Clinical Notes" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  const isActive = (path: string) => location === path;

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/">
              <a className="flex-shrink-0 flex items-center">
                <MedicalServices className="text-primary-600 mr-2 h-6 w-6" />
                <span className="font-serif font-bold text-xl text-primary-700">PhysioAI</span>
              </a>
            </Link>
            <nav className="hidden md:ml-8 md:flex md:space-x-8">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <a
                    className={`${
                      isActive(item.href)
                        ? "border-primary-500 text-primary-600"
                        : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
                    } border-b-2 px-1 pt-1 inline-flex items-center text-sm font-medium`}
                  >
                    {item.label}
                  </a>
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center">
            <Link href="/clinical-notes">
              <Button className="bg-primary-600 hover:bg-primary-700 text-white shadow-sm">
                Clinical Notes
              </Button>
            </Link>
            <div className="ml-4 md:hidden flex items-center">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-neutral-500 hover:bg-neutral-100">
                    <span className="sr-only">Open main menu</span>
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[240px] sm:w-[300px]">
                  <nav className="flex flex-col gap-4 mt-6">
                    {navItems.map((item) => (
                      <Link key={item.href} href={item.href}>
                        <a
                          className={`${
                            isActive(item.href)
                              ? "text-primary-600 font-medium"
                              : "text-neutral-600 hover:text-neutral-900"
                          } px-2 py-2 text-base`}
                          onClick={() => setOpen(false)}
                        >
                          {item.label}
                        </a>
                      </Link>
                    ))}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
