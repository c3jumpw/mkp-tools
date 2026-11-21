import type { Metadata } from "next";
import Tour from "@/components/tour/Tour";

export const metadata: Metadata = { title: "Getting started · PingPath" };

export default function TourPage() {
  return <Tour />;
}
