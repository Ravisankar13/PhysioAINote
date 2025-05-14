import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Leaf, MessageSquareText, Menu, LogOut, User, Bone, CreditCard, FileAudio, Stethoscope } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const Header = () => {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { user, logoutMutation } = useAuth();

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/clinical-notes", label: "Clinical Notes" },
    { href: "/notes", label: "Patient Sessions" },
    { href: "/skeleton-tool", label: "2D Skeleton Tool" },
    { href: "/skeleton-3d-tool", label: "3D Skeleton Tool" },
    { href: "/shared-notes", label: "Shared Notes" },
    { href: "/research", label: "Research" },
    { href: "/exercises", label: "Exercise Library" },
    { href: "/manual-therapy", label: "Manual Therapy" },
    { href: "/membership", label: "Membership" },
  ];

  const isActive = (path: string) => location === path;
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center">
          {/* Logo section (left) */}
          <div className="flex-shrink-0">
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <Leaf className="text-primary mr-2 h-7 w-7" />
                <span className="font-bold text-xl tracking-tight text-foreground">
                  <span className="text-primary">PhysioAI</span>
                  <span className="text-secondary ml-1">Conversation</span>
                </span>
              </div>
            </Link>
          </div>
          
          {/* Navigation Links (centered) */}
          <div className="hidden md:flex flex-1 justify-center">
            <nav className="flex items-center">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <span
                    className={`${
                      isActive(item.href)
                        ? "text-primary font-semibold border-b-2 border-primary"
                        : "text-muted-foreground hover:text-primary transition-colors duration-200"
                    } px-3 py-4 mx-1 text-sm font-medium cursor-pointer whitespace-nowrap`}
                  >
                    {item.label}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
          
          {/* Action buttons (right) */}
          <div className="flex items-center space-x-4">
            <Link href="/clinical-notes">
              <Button className="bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm flex items-center gap-2">
                <MessageSquareText className="h-4 w-4" />
                <span>AI Notes</span>
              </Button>
            </Link>
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex items-center" asChild>
                    <Link href="/my-notes">
                      <div className="flex items-center cursor-pointer w-full">
                        <User className="mr-2 h-4 w-4" />
                        <span>My Notes</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center" asChild>
                    <Link href="/notes">
                      <div className="flex items-center cursor-pointer w-full">
                        <Stethoscope className="mr-2 h-4 w-4" />
                        <span>Patient Sessions</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center" asChild>
                    <Link href="/skeleton-tool">
                      <div className="flex items-center cursor-pointer w-full">
                        <Bone className="mr-2 h-4 w-4" />
                        <span>2D Skeleton Tool</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center" asChild>
                    <Link href="/skeleton-3d-tool">
                      <div className="flex items-center cursor-pointer w-full">
                        <Bone className="mr-2 h-4 w-4" />
                        <span>3D Skeleton Tool</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center" asChild>
                    <Link href="/exercises">
                      <div className="flex items-center cursor-pointer w-full">
                        <Bone className="mr-2 h-4 w-4" />
                        <span>Exercise Library</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center" asChild>
                    <Link href="/manual-therapy">
                      <div className="flex items-center cursor-pointer w-full">
                        <Bone className="mr-2 h-4 w-4" />
                        <span>Manual Therapy</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center" asChild>
                    <Link href="/membership">
                      <div className="flex items-center cursor-pointer w-full">
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span>Membership</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center cursor-pointer" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth">
                <Button variant="outline" className="hidden md:flex">Sign In</Button>
              </Link>
            )}
            
            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
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
                        <span
                          className={`${
                            isActive(item.href)
                              ? "text-primary font-medium"
                              : "text-muted-foreground hover:text-foreground"
                          } px-2 py-2 text-base block cursor-pointer`}
                          onClick={() => setOpen(false)}
                        >
                          {item.label}
                        </span>
                      </Link>
                    ))}
                    
                    {/* Auth related mobile menu items */}
                    {user ? (
                      <>
                        <Link href="/my-notes">
                          <span
                            className="px-2 py-2 text-base block cursor-pointer text-muted-foreground hover:text-foreground"
                            onClick={() => setOpen(false)}
                          >
                            My Notes
                          </span>
                        </Link>
                        <Link href="/notes">
                          <span
                            className="px-2 py-2 text-base block cursor-pointer text-muted-foreground hover:text-foreground"
                            onClick={() => setOpen(false)}
                          >
                            Patient Sessions
                          </span>
                        </Link>
                        <Link href="/skeleton-tool">
                          <span
                            className="px-2 py-2 text-base block cursor-pointer text-muted-foreground hover:text-foreground"
                            onClick={() => setOpen(false)}
                          >
                            2D Skeleton Tool
                          </span>
                        </Link>
                        <Link href="/skeleton-3d-tool">
                          <span
                            className="px-2 py-2 text-base block cursor-pointer text-muted-foreground hover:text-foreground"
                            onClick={() => setOpen(false)}
                          >
                            3D Skeleton Tool
                          </span>
                        </Link>
                        <Link href="/exercises">
                          <span
                            className="px-2 py-2 text-base block cursor-pointer text-muted-foreground hover:text-foreground"
                            onClick={() => setOpen(false)}
                          >
                            Exercise Library
                          </span>
                        </Link>
                        <Link href="/manual-therapy">
                          <span
                            className="px-2 py-2 text-base block cursor-pointer text-muted-foreground hover:text-foreground"
                            onClick={() => setOpen(false)}
                          >
                            Manual Therapy
                          </span>
                        </Link>
                        <Link href="/membership">
                          <span
                            className="px-2 py-2 text-base block cursor-pointer text-muted-foreground hover:text-foreground"
                            onClick={() => setOpen(false)}
                          >
                            Membership
                          </span>
                        </Link>
                        <span
                          className="px-2 py-2 text-base block cursor-pointer text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            handleLogout();
                            setOpen(false);
                          }}
                        >
                          Logout
                        </span>
                      </>
                    ) : (
                      <Link href="/auth">
                        <span
                          className="px-2 py-2 text-base block cursor-pointer text-primary font-medium"
                          onClick={() => setOpen(false)}
                        >
                          Sign In
                        </span>
                      </Link>
                    )}
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
