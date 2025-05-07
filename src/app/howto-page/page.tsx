"use client"
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Download, ExternalLink } from "lucide-react";

export default function SpotifyHistoryPage() {
  const [showSteps, setShowSteps] = useState(false);

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 text-center border border-gray-200 shadow-md rounded-lg mt-24">
      <h1 className="text-3xl font-bold mb-4">How to Get Your Extended Streaming History from Spotify</h1>
      <p className="text-gray-600 mb-6">
        Follow these steps to request and download your extended streaming history from Spotify.
      </p>
      
      <Button onClick={() => setShowSteps(!showSteps)}>
        {showSteps ? "Hide Steps" : "Show Steps"}
      </Button>
      
      {showSteps && (
        <Card className="mt-6 text-left">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-start gap-2">
              <span className="font-bold">1.</span>
              <p>
                Go to the <a href="https://www.spotify.com/account/privacy/" target="_blank" className="text-blue-600 underline">Spotify Privacy Settings</a> <ExternalLink size={14} className="inline" />.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              <p>Scroll down to the <b>Download your data</b> section and click <b>Request Data</b>.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              <p>Ensure you select the <b>Extended Streaming History</b> option before submitting your request.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold">4.</span>
              <p>Wait for Spotify to process your request. This may take a few days.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold">5.</span>
              <p>Once you receive an email from Spotify, follow the link to download your data.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-6">
        <Button className="hover:text-[#1DB954]" variant="outline" onClick={() => window.open("https://www.spotify.com/account/privacy/")}> 
          Go to Spotify Privacy Settings <ExternalLink size={16} className="ml-1" />
        </Button>
      </div>
    </div>
  );
}
