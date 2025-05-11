import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Leaf, MessageSquareText, Menu } from "lucide-react";

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
                <Leaf className="text-primary mr-2 h-7 w-7" />
                <span className="font-bold text-xl tracking-tight text-foreground">
                  <span className="text-primary">PhysioAI</span>
                  <span className="text-secondary ml-1">Conversation</span>
                </span>
              </a>
            </Link>
            <nav className="hidden md:ml-10 md:flex md:space-x-10">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <a
                    className={`${
                      isActive(item.href)
                        ? "text-primary font-semibold"
                        : "text-muted-foreground hover:text-primary transition-colors duration-200"
                    } px-1 py-2 text-sm font-medium`}
                  >
                    {item.label}
                  </a>
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center">
            <Link href="/clinical-notes">
              <Button className="bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm flex items-center gap-2">
                <MessageSquareText className="h-4 w-4" />
                <span>AI Notes</span>
              </Button>
            </Link>
            <div className="ml-4 md:hidden flex items-center">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-accent">
                    <span className="sr-only">Open main menu</span>
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[240px] sm:w-[300px]">
                  <div className="flex items-center mt-4 mb-8">
                    <Leaf className="text-primary mr-2 h-6 w-6" />
                    <span className="font-bold text-lg">
                      <span className="text-primary">PhysioAI</span>
                      <span className="text-secondary ml-1">Conversation</span>
                    </span>
                  </div>
                  <nav className="flex flex-col gap-4">
                    {navItems.map((item) => (
                      <Link key={item.href} href={item.href}>
                        <a
                          className={`${
                            isActive(item.href)
                              ? "text-primary font-medium"
                              : "text-muted-foreground hover:text-foreground"
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
