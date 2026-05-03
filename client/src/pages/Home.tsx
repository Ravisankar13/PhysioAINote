import { Helmet } from "react-helmet";
import { Link } from "wouter";
import {
  ArrowRight,
  MessageSquare,
  Mic,
  Bone,
  ClipboardList,
  Stethoscope,
  Activity,
  FileDown,
  Sparkles,
  ShieldCheck,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import TrialBanner from "@/components/TrialBanner";

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Conversational clinical consultation",
    body: "Ask any musculoskeletal question and get a structured, evidence-graded answer with inline citations and clinical reasoning you can defend.",
  },
  {
    icon: Mic,
    title: "Live voice transcription & analysis",
    body: "Record or stream a session — PhysioGPT transcribes, de-identifies and pulls out subjective findings, red flags and assessment cues in real time.",
  },
  {
    icon: Bone,
    title: "Interactive 3D anatomy",
    body: "Drop pain markers on a high-fidelity skeleton. Visualise load, force vectors and tissue stress, and see exactly which structures are implicated.",
  },
  {
    icon: ClipboardList,
    title: "Auto-generated treatment pathways",
    body: "Get a phased plan covering exercises, manual therapy, electrophysical agents and lifestyle adjuncts — all tied back to the patient's findings.",
  },
  {
    icon: Stethoscope,
    title: "Special tests & red-flags sidebar",
    body: "Region-aware special-test suggestions with sensitivity / specificity, plus an always-on red-flag sidebar so nothing dangerous slips by.",
  },
  {
    icon: Activity,
    title: "What-if & sling simulations",
    body: "Simulate interventions, posture changes and sling activation overrides. Watch the recovery curve, joint loads and risk scores update live.",
  },
  {
    icon: FileDown,
    title: "PDF export of clinical responses",
    body: "Export any PhysioGPT consult — reasoning, citations, plan and visuals — as a polished PDF you can drop straight into the patient record.",
  },
  {
    icon: ShieldCheck,
    title: "Evidence-graded answers",
    body: "Every recommendation carries an evidence grade, source citation and a clinical rationale, so you always know how strong the support is.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Describe the case",
    body: "Type the presentation, paste your subjective notes, or just talk — PhysioGPT pulls out region, mechanism, irritability and red flags.",
  },
  {
    n: "2",
    title: "PhysioGPT reasons through it",
    body: "Differential diagnoses, special tests, biomechanical contributors and 3D pain/load visualisations are generated together with citations.",
  },
  {
    n: "3",
    title: "Take it into your session",
    body: "Add prescriptions to the plan cart, simulate the recovery curve, swap modalities by phase, then export the final plan as a PDF.",
  },
];

const SAMPLE_Q =
  "47 y/o runner, 6 weeks of insidious lateral knee pain, worse on downhill running, no trauma. What's your differential and what would you do first?";

const SAMPLE_A_BULLETS = [
  {
    label: "Top differential",
    grade: "B",
    text: "Iliotibial band syndrome — mechanism, location and aggravating factor all fit; supported by Aderem & Louw (2015) systematic review.",
  },
  {
    label: "First-line tests",
    grade: "B",
    text: "Noble's compression, Ober's, single-leg squat for hip abductor control. Rule out lateral meniscus with McMurray.",
  },
  {
    label: "Initial plan",
    grade: "A",
    text: "Load management + hip abductor / external rotator strengthening (Fairclough et al., 2007). Defer manual ITB stretching — low-quality evidence.",
  },
];

const Home = () => {
  return (
    <>
      <Helmet>
        <title>PhysioGPT — AI clinical consultant for physiotherapists</title>
        <meta
          name="description"
          content="PhysioGPT is an AI clinical consultant built for physiotherapists. Ask any musculoskeletal question, get evidence-graded answers, 3D anatomy visualisation, auto-generated treatment plans and PDF export."
        />
        <meta property="og:title" content="PhysioGPT — AI clinical consultant for physiotherapists" />
        <meta
          property="og:description"
          content="Conversational clinical reasoning, live session transcription, 3D pain & load visualisation, auto treatment pathways and what-if recovery simulations — in one tool."
        />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="container mx-auto px-4 py-4">
        <TrialBanner />
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.15),_transparent_60%)]" />
        <div className="container relative mx-auto px-4 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              The AI clinical consultant built for physiotherapists
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-6xl">
              Meet <span className="text-emerald-400">PhysioGPT</span>.
              <br className="hidden md:block" />
              Your clinical co-pilot for every patient.
            </h1>
            <p className="mt-6 text-lg text-slate-300 md:text-xl">
              Ask any musculoskeletal question. Get an evidence-graded answer with
              citations, 3D anatomy visualisation, an auto-generated treatment
              plan and a recovery simulation — all in one conversation.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/physiogpt">
                <Button
                  size="lg"
                  className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                  data-testid="button-hero-open-physiogpt"
                >
                  Open PhysioGPT
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#what-physiogpt-does">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-600 bg-transparent text-slate-100 hover:bg-slate-800 hover:text-white"
                  data-testid="button-hero-learn-more"
                >
                  Learn more
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* What PhysioGPT does */}
      <section id="what-physiogpt-does" className="bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              What PhysioGPT does
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Eight capabilities working together so you can reason faster, plan
              better and document less.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-xl border border-slate-200 bg-slate-50 p-6 transition-shadow hover:shadow-md"
                data-testid={`feature-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              From a one-line case to a defensible plan in under a minute.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map(s => (
              <div
                key={s.n}
                className="relative rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
                data-testid={`step-${s.n}`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-base font-bold text-white">
                  {s.n}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample interaction */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                A flavour of asking PhysioGPT
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Every answer is structured, cited and grade-rated — so you can
                trust it on the floor.
              </p>
            </div>

            <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
              {/* Question */}
              <div className="flex items-start gap-3 bg-slate-50 p-5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                  <Quote className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    You ask
                  </div>
                  <p className="mt-1 text-slate-800">{SAMPLE_Q}</p>
                </div>
              </div>

              {/* Answer */}
              <div className="border-t border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    PhysioGPT replies
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  {SAMPLE_A_BULLETS.map(b => (
                    <div
                      key={b.label}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {b.label}
                        </span>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                          Evidence {b.grade}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{b.text}</p>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-xs italic text-slate-500">
                  Sample shown for illustration. Real PhysioGPT replies include
                  inline citations, suggested special tests, 3D anatomy
                  visualisations, a phased treatment plan and a recovery
                  simulation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-emerald-500 to-teal-600 py-20 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Ready to consult with PhysioGPT?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-emerald-50">
            Open PhysioGPT and bring your next patient case. Reason faster, plan
            better, document less.
          </p>
          <div className="mt-8">
            <Link href="/physiogpt">
              <Button
                size="lg"
                className="bg-white text-emerald-700 hover:bg-emerald-50"
                data-testid="button-final-cta-open-physiogpt"
              >
                Open PhysioGPT
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;
