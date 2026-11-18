import type { Metadata } from "next";
import Tour from "./Tour";

export const metadata: Metadata = { title: "Getting started · Circuit Book" };

/**
 * A swipeable, slide-by-slide walk through every screen, built from the same
 * annotated screenshots as the Guide. Today opens it once on a first visit;
 * after that it lives behind "Take the tour" at the top of the Guide.
 */
export default function TourPage() {
  return <Tour />;
}
