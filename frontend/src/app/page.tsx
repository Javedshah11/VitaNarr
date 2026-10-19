import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpenText,
  Check,
  Fingerprint,
  MessageCircleQuestion,
  Quote,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import heroImage from '../../../docs/assets/Golden Hour Lakeside Journaling Retreat-11.png';
import { PublicFooter } from '@/components/public-footer';
import { PublicHeader } from '@/components/public-header';

const steps = [
  {
    number: '01',
    title: 'Remember naturally',
    description:
      'Respond to thoughtful prompts about childhood, family, turning points and the everyday moments that shaped you.',
    icon: MessageCircleQuestion,
  },
  {
    number: '02',
    title: 'Gather what matters',
    description:
      'Keep memories, dates, photographs and documents together in a private, organized personal archive.',
    icon: Fingerprint,
  },
  {
    number: '03',
    title: 'Shape your story',
    description:
      'Turn only your confirmed memories into clear, beautiful chapters—always with your review and approval.',
    icon: BookOpenText,
  },
];

const features = [
  'Guided life interviews',
  'Private memory vault',
  'Chronological life timeline',
  'Fact-grounded AI assistance',
  'Chapter review and revision',
  'Book-ready exports',
];

export default function Home() {
  return (
    <div className="overflow-hidden bg-surface">
      <PublicHeader />
      <main>
        <section className="relative isolate min-h-[54rem] pt-24 lg:min-h-screen">
          <div className="absolute inset-0 -z-20">
            <Image
              src={heroImage}
              alt="An open journal and old books overlooking a mountain lake at sunrise"
              fill
              priority
              className="object-cover object-[58%_center]"
              sizes="100vw"
            />
          </div>
          <div className="hero-wash absolute inset-0 -z-10" />
          <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-[90rem] items-center px-5 py-24 sm:px-8 lg:px-12">
            <div className="max-w-3xl">
              <p className="eyebrow-text animate-rise">Your story, in your words</p>
              <h1 className="mt-6 max-w-3xl font-serif text-[clamp(4.2rem,9vw,8.8rem)] font-medium leading-[0.82] tracking-[-0.065em] text-ink-dark animate-rise animation-delay-1">
                Every life deserves to be remembered.
              </h1>
              <p className="mt-8 max-w-xl text-lg leading-8 text-ink-dark/75 animate-rise animation-delay-2 sm:text-xl">
                VitaNarr helps you gather the moments that made you, then shape them into a lasting
                autobiography—without inventing the parts you never told us.
              </p>
              <div className="mt-10 flex flex-col gap-3 animate-rise animation-delay-3 sm:flex-row">
                <Link href="/register" className="button-primary button-large">
                  Begin your story <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <a href="#how-it-works" className="button-glass button-large">
                  See how it works
                </a>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-ink-dark/70 animate-rise animation-delay-3">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="size-4 text-brand" aria-hidden="true" />
                  Private by design
                </span>
                <span className="inline-flex items-center gap-2">
                  <Check className="size-4 text-brand" aria-hidden="true" />
                  You approve every chapter
                </span>
              </div>
            </div>
          </div>
          <div className="absolute bottom-8 right-8 hidden max-w-xs rounded-2xl border border-white/30 bg-white/65 p-5 text-sm leading-6 text-ink-dark shadow-2xl backdrop-blur-xl xl:block">
            <p className="font-serif text-xl font-semibold">A quieter way to begin.</p>
            <p className="mt-2 text-ink-dark/65">
              Start with one memory. VitaNarr helps you find the next.
            </p>
          </div>
        </section>

        <section id="how-it-works" className="section-shell scroll-mt-16">
          <div className="max-w-2xl">
            <p className="eyebrow-text">A story built gently</p>
            <h2 className="section-heading mt-4">You lived it. We help you tell it.</h2>
            <p className="section-copy mt-6">
              Writing a whole life can feel impossible. VitaNarr turns it into a series of
              meaningful conversations and manageable moments.
            </p>
          </div>
          <div className="mt-16 grid gap-px overflow-hidden rounded-[2rem] border border-stroke bg-stroke md:grid-cols-3">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <article key={step.number} className="group bg-card p-8 sm:p-10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-[0.18em] text-accent">
                      {step.number}
                    </span>
                    <Icon
                      className="size-5 text-brand transition-transform group-hover:-rotate-6 group-hover:scale-110"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="mt-16 font-serif text-3xl font-semibold tracking-[-0.03em]">
                    {step.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-muted">{step.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="principles" className="bg-evergreen text-paper scroll-mt-16">
          <div className="section-shell grid items-center gap-16 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-lg overflow-hidden rounded-[2rem] bg-[#203a34] p-8 shadow-2xl">
              <div className="absolute inset-5 rounded-[1.4rem] border border-accent/35" />
              <div className="relative flex h-full flex-col justify-between border-y border-accent/25 py-12 text-center">
                <Sparkles className="mx-auto size-5 text-accent" aria-hidden="true" />
                <div>
                  <p className="text-xs font-bold tracking-[0.28em] text-accent">
                    A LIFE IN CHAPTERS
                  </p>
                  <p className="mt-8 font-serif text-5xl font-medium leading-none tracking-[-0.04em] sm:text-6xl">
                    The Story
                    <br />
                    of My Life
                  </p>
                  <div className="mx-auto mt-8 h-px w-20 bg-accent/60" />
                  <p className="mt-8 text-sm tracking-[0.14em] text-paper/60">WRITTEN BY YOU</p>
                </div>
                <p className="font-serif italic text-paper/70">Preserved with VitaNarr</p>
              </div>
            </div>
            <div>
              <p className="eyebrow-text text-accent">Our most important promise</p>
              <h2 className="mt-5 max-w-2xl font-serif text-5xl font-medium leading-[0.95] tracking-[-0.045em] sm:text-7xl">
                Beautiful writing. Still unmistakably true.
              </h2>
              <Quote className="mt-10 size-7 text-accent" aria-hidden="true" />
              <p className="mt-5 max-w-2xl font-serif text-2xl leading-relaxed text-paper/85 sm:text-3xl">
                AI can help you find the words, but it should never invent the life behind them.
              </p>
              <p className="mt-6 max-w-xl leading-8 text-paper/60">
                Original memories stay separate from generated drafts. You can trace what informed a
                chapter, correct it, rewrite it and decide when it becomes part of your story.
              </p>
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {['Your facts remain the source', 'Nothing publishes without approval'].map(
                  (item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 rounded-2xl border border-paper/10 bg-paper/5 p-4"
                    >
                      <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                      <span className="text-sm font-semibold text-paper/80">{item}</span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="section-shell scroll-mt-16">
          <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:items-end">
            <div>
              <p className="eyebrow-text">One home for a whole life</p>
              <h2 className="section-heading mt-4">
                From scattered memories to a story that lasts.
              </h2>
            </div>
            <p className="section-copy lg:pb-2">
              VitaNarr is being built as a complete autobiography workspace, connecting every
              chapter back to the memories, interviews and moments that inspired it.
            </p>
          </div>
          <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={feature}
                className="flex items-center gap-4 rounded-2xl border border-stroke bg-card p-5 shadow-[0_10px_30px_rgba(23,61,56,0.04)]"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/8 text-xs font-bold text-brand">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="font-semibold">{feature}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28">
          <div className="mx-auto max-w-[86rem] overflow-hidden rounded-[2.5rem] bg-soft-sand px-6 py-16 text-center sm:px-12 lg:py-24">
            <Sparkles className="mx-auto size-6 text-accent" aria-hidden="true" />
            <h2 className="mx-auto mt-7 max-w-3xl font-serif text-5xl font-medium leading-[0.95] tracking-[-0.05em] text-ink-dark sm:text-7xl">
              Your first chapter can begin with one memory.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-ink-dark/65">
              Create your private VitaNarr workspace and begin at your own pace.
            </p>
            <Link href="/register" className="button-primary button-large mt-9">
              Start preserving your story <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
