"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedSection } from "@/components/ui/animated-section";

export function ContactSection() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <section id="contact" className="scroll-mt-24 bg-white py-16 dark:bg-slate-950 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 sm:text-3xl lg:text-4xl">Get in Touch</h2>
          <p className="mt-3 text-sm text-gray-600 dark:text-slate-400 sm:mt-4 sm:text-base">
            Questions about the BNB Hack build or agent stack integration?
          </p>
        </AnimatedSection>
        <AnimatedSection delay={200} animation="scale-in" className="mt-8 sm:mt-10">
          <Card className="transition-shadow duration-300 hover:shadow-md">
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <p className="motion-safe:animate-fade-in text-center text-green-600 dark:text-green-400">
                  Thank you! We&apos;ll be in touch shortly.
                </p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" required placeholder="Your name" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" required placeholder="you@example.com" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="message">Message</Label>
                    <textarea
                      id="message"
                      required
                      rows={4}
                      placeholder="Tell us about your agent or hackathon submission..."
                      className="mt-1 flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600">
                    Send Message
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </AnimatedSection>
      </div>
    </section>
  );
}
