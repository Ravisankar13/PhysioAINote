import { Button } from "@/components/ui/button";
import { MessageSquareText, ArrowRight } from "lucide-react";
import { Link } from "wouter";

const CTASection = () => {
  return (
    <section className="bg-gradient-to-br from-primary to-secondary relative overflow-hidden">
      {/* Background abstract shapes */}
      <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQ0MCIgaGVpZ2h0PSI3NjgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IHgxPSIxMDAlIiB5MT0iMTAwJSIgeDI9IjAlIiB5Mj0iMCUiIGlkPSJhIj48c3RvcCBzdG9wLWNvbG9yPSIjZmZmIiBvZmZzZXQ9IjAlIi8+PHN0b3Agc3RvcC1jb2xvcj0iI2ZmZiIgc3RvcC1vcGFjaXR5PSIwIiBvZmZzZXQ9IjEwMCUiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNjAgODJjNDYuMzkyIDAgODEgMzQuNjA4IDgxIDgxcy0zNC42MDggODEtODEgODFjLTQ2LjM5MiAwLTgxLTM0LjYwOC04MS04MXMzNC42MDgtODEgODEtODF6TTEwODAgMTYyYzQ2LjM5MiAwIDgxIDM0LjYwOCA4MSA4MXMtMzQuNjA4IDgxLTgxIDgxYy00Ni4zOTIgMC04MS0zNC42MDgtODEtODFzMzQuNjA4LTgxIDgxLTgxeiIgZmlsbD0idXJsKCNhKSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTQwLDApIi8+PC9nPjwvc3ZnPg==')] mix-blend-overlay"></div>

      <div className="max-w-7xl mx-auto py-20 px-4 sm:px-6 lg:py-28 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              <span className="block">Ready to elevate your</span>
              <span className="block">physiotherapy practice?</span>
            </h2>
            <p className="mt-6 text-lg text-white/80 max-w-xl">
              Join thousands of physiotherapists who are saving time, enhancing
              their clinical decision-making, and delivering better patient care
              with our platform.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-5">
              <Link href="/membership">
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 shadow-md flex items-center gap-2 w-full sm:w-auto"
                >
                  <MessageSquareText className="h-5 w-5" />
                  <span className="font-semibold">
                    Explore Membership Plans
                  </span>
                </Button>
              </Link>
              <Link to="/clinical-notes">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white bg-white/10 hover:bg-white/20 flex items-center gap-2 w-full sm:w-auto"
                >
                  <span>Try Free Demo</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-10 lg:mt-0 hidden lg:block">
            <div className="relative mx-auto w-full max-w-md">
              <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-xl p-5 relative overflow-hidden">
                <div className="absolute right-4 top-4 w-16 h-16 rounded-full bg-secondary/70 flex items-center justify-center">
                  <span className="text-white font-bold">AI</span>
                </div>

                <div className="p-4 rounded-lg bg-white/10 border border-white/20">
                  <h3 className="text-white font-semibold text-lg mb-4">
                    Sample SOAP Note
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <p className="text-white/70 text-sm font-medium mb-1">
                        Subjective
                      </p>
                      <div className="h-3 bg-white/20 rounded-full w-11/12"></div>
                      <div className="h-3 bg-white/20 rounded-full w-4/5 mt-1"></div>
                    </div>

                    <div>
                      <p className="text-white/70 text-sm font-medium mb-1">
                        Objective
                      </p>
                      <div className="h-3 bg-white/20 rounded-full w-full"></div>
                      <div className="h-3 bg-white/20 rounded-full w-2/3 mt-1"></div>
                    </div>

                    <div>
                      <p className="text-white/70 text-sm font-medium mb-1">
                        Assessment
                      </p>
                      <div className="h-3 bg-white/20 rounded-full w-10/12"></div>
                      <div className="h-3 bg-white/20 rounded-full w-3/4 mt-1"></div>
                    </div>

                    <div>
                      <p className="text-white/70 text-sm font-medium mb-1">
                        Plan
                      </p>
                      <div className="h-3 bg-white/20 rounded-full w-11/12"></div>
                      <div className="h-3 bg-white/20 rounded-full w-1/2 mt-1"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
