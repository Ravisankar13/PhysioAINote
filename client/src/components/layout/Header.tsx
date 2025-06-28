import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Leaf,
  MessageSquareText,
  Menu,
  LogOut,
  User,
  Bone,
  CreditCard,
  FileAudio,
  Stethoscope,
  Activity,
  Users,
  BarChart3,
  Brain,
  BookOpen,
  Camera,
  Scan,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "react-router-dom";

const Header = () => {
  const [open, setOpen] = useState(false);
  const { user, logoutMutation } = useAuth();
  const location = useLocation().pathname;

  // Check if user is admin
  const adminUsernames = ["Fateofjustice"];
  const isAdmin = user && adminUsernames.includes(user.username);

  const navItems = [
    { to: "/", label: "Home" },
    { to: "/case-studies", label: "AI Case Studies" },
    { to: "/shared-cases", label: "Forum" },
    { to: "/exercises", label: "Exercise Library" },
    { to: "/manual-therapy", label: "Manual Therapy" },
    { to: "/virtual-patients", label: "Virtual Patients" },
    { to: "/membership", label: "Membership" },
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
            <Link to="/">
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
                <Link key={item.to} to={item.to}>
                  <span
                    className={`${
                      isActive(item.to)
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
            <Link to="/physiogpt">
              <Button className="bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm flex items-center gap-2">
                <Brain className="h-4 w-4" />
                <span>PhysioGPT</span>
              </Button>
            </Link>
            <Link to="/clinical-notes">
              <Button className="bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm flex items-center gap-2">
                <MessageSquareText className="h-4 w-4" />
                <span>AI Notes</span>
              </Button>
            </Link>
            <Link to="/research">
              <Button className="bg-secondary hover:bg-secondary/90 text-white font-semibold shadow-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span>Research</span>
              </Button>
            </Link>
            <Link to="/motion-capture">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm flex items-center gap-2">
                <Camera className="h-4 w-4" />
                <span>Motion Capture</span>
              </Button>
            </Link>
            <Link to="/static-postural-analysis">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-sm flex items-center gap-2">
                <Scan className="h-4 w-4" />
                <span>Static Analysis</span>
              </Button>
            </Link>
            <Link to="/integrated-assessment">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-sm flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                <span>Full Assessment</span>
              </Button>
            </Link>
            <Link to="/intelligent-assessment">
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold shadow-sm flex items-center gap-2">
                <Brain className="h-4 w-4" />
                <span>Smart Assessment</span>
              </Button>
            </Link>

            {/* Login button for users who aren't logged in - visible on all devices */}
            {!user && (
              <Link to="/auth">
                <Button
                  variant="outline"
                  className="flex items-center gap-1 font-medium"
                >
                  <User className="h-4 w-4" />
                  <span>Login</span>
                </Button>
              </Link>
            )}

            {/* Direct logout button for mobile - always visible when logged in */}
            {user && (
              <Button
                variant="outline"
                size="sm"
                className="md:hidden"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </Button>
            )}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full"
                  >
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
                    <Link to="/my-notes">
                      <div className="flex items-center cursor-pointer w-full">
                        <User className="mr-2 h-4 w-4" />
                        <span>My Notes</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center" asChild>
                    <Link to="/notes">
                      <div className="flex items-center cursor-pointer w-full">
                        <Stethoscope className="mr-2 h-4 w-4" />
                        <span>Patient Sessions</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>


                  <DropdownMenuItem className="flex items-center" asChild>
                    <Link to="/virtual-patients">
                      <div className="flex items-center cursor-pointer w-full">
                        <Activity className="mr-2 h-4 w-4" />
                        <span>Virtual Patients</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center" asChild>
                    <Link to="/shared-cases">
                      <div className="flex items-center cursor-pointer w-full">
                        <Users className="mr-2 h-4 w-4" />
                        <span>Peer Exchange</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center" asChild>
                    <Link to="/exercises">
                      <div className="flex items-center cursor-pointer w-full">
                        <Bone className="mr-2 h-4 w-4" />
                        <span>Exercise Library</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center" asChild>
                    <Link to="/manual-therapy">
                      <div className="flex items-center cursor-pointer w-full">
                        <Bone className="mr-2 h-4 w-4" />
                        <span>Manual Therapy</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center" asChild>
                    <Link to="/virtual-patients">
                      <div className="flex items-center cursor-pointer w-full">
                        <Activity className="mr-2 h-4 w-4" />
                        <span>Virtual Patients</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem className="flex items-center" asChild>
                    <Link to="/membership">
                      <div className="flex items-center cursor-pointer w-full">
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span>Membership</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>

                  {/* Admin Dashboard - only visible to admin users */}
                  {isAdmin && (
                    <DropdownMenuItem className="flex items-center" asChild>
                      <Link to="/admin">
                        <div className="flex items-center cursor-pointer w-full">
                          <BarChart3 className="mr-2 h-4 w-4" />
                          <span>Admin Dashboard</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem
                    className="flex items-center cursor-pointer"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button variant="outline" className="hidden md:flex">
                  Sign In
                </Button>
              </Link>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground hover:bg-accent"
                  >
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
                      <Link key={item.to} to={item.to}>
                        <span
                          className={`${
                            isActive(item.to)
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
                        <Link to="/my-notes">
                          <span
                            className="px-2 py-2 text-base block cursor-pointer text-muted-foreground hover:text-foreground"
                            onClick={() => setOpen(false)}
                          >
                            My Notes
                          </span>
                        </Link>
                        <Link to="/notes">
                          <span
                            className="px-2 py-2 text-base block cursor-pointer text-muted-foreground hover:text-foreground"
                            onClick={() => setOpen(false)}
                          >
                            Patient Sessions
                          </span>
                        </Link>


                        <Link to="/exercises">
                          <span
                            className="px-2 py-2 text-base block cursor-pointer text-muted-foreground hover:text-foreground"
                            onClick={() => setOpen(false)}
                          >
                            Exercise Library
                          </span>
                        </Link>
                        <Link to="/manual-therapy">
                          <span
                            className="px-2 py-2 text-base block cursor-pointer text-muted-foreground hover:text-foreground"
                            onClick={() => setOpen(false)}
                          >
                            Manual Therapy
                          </span>
                        </Link>
                        <Link to="/membership">
                          <span
                            className="px-2 py-2 text-base block cursor-pointer text-muted-foreground hover:text-foreground"
                            onClick={() => setOpen(false)}
                          >
                            Membership
                          </span>
                        </Link>
                        <span
                          className="px-2 py-2 text-base block cursor-pointer text-muted-foreground hover:text-foreground font-medium"
                          onClick={() => {
                            handleLogout();
                            setOpen(false);
                          }}
                        >
                          <div className="flex items-center">
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                          </div>
                        </span>
                      </>
                    ) : (
                      <Link to="/auth">
                        <span
                          className="px-2 py-2 text-base block cursor-pointer text-primary font-medium"
                          onClick={() => setOpen(false)}
                        >
                          <div className="flex items-center">
                            <User className="mr-2 h-4 w-4" />
                            Login
                          </div>
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
