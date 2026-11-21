import { notFound } from "next/navigation";
import type { Metadata } from "next";
import TourScreen from "@/components/tour/TourScreen";
import { isScreen } from "@/lib/tour/screens";

export const metadata: Metadata = { title: "Tour screen · PingPath", robots: { index: false, follow: false } };

/** A live sample screen for the Getting started tour (see src/lib/tour). */
export default async function TourScreenPage({ params }: { params: Promise<{ screen: string }> }) {
  const { screen } = await params;
  const id = `blasts/${screen}`;
  if (!isScreen(id)) notFound();
  return <TourScreen id={id} />;
}
