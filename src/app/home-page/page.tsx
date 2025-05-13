"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExternalLink, BarChart2 } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Logo from "@/img/favicon.jpeg";
import { Label } from "@/components/ui/label";
import SpotifyWebApi from "spotify-web-api-node";

interface ListeningEntry {
  ts: string;
  platform: string;
  ms_played: number;
  master_metadata_track_name: string | null;
  master_metadata_album_artist_name: string | null;
  master_metadata_album_album_name: string | null;
  spotify_track_uri: string;
  reason_start: string;
  reason_end: string;
  shuffle: boolean;
  skipped: boolean;
  offline: boolean;
  offline_timestamp: string | null;
  incognito_mode: boolean;
}

function msToMinutes(ms: number): number {
  return ms / 60000;
}

function formatDate(ts: string): string {
  const date = new Date(ts);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
];

// Initialize Spotify API
const spotifyApi = new SpotifyWebApi({
  clientId: "fff5fda968834ab8a5437e9e75f9cdd8",
  redirectUri: "https://unwindify.vercel.app/home-page/callback",
});

const SPOTIFY_SCOPES = ["user-read-recently-played", "user-top-read"];

const App = () => {
  const [listeningData, setListeningData] = useState<ListeningEntry[]>([]);
  const [sortMethod, setSortMethod] = useState<"oldest" | "newest" | "listens">(
    "oldest"
  );
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  const [originalData, setOriginalData] = useState<ListeningEntry[]>([]);
  const [trackListenCounts, setTrackListenCounts] = useState<
    Map<string, { count: number; entry: ListeningEntry; totalMsPlayed: number }>
  >(new Map());
  const [artistStats, setArtistStats] = useState<
    { artist: string; minutes: number }[]
  >([]);
  const [longestStretch, setLongestStretch] = useState<{
    start: string;
    end: string;
    minutes: number;
  } | null>(null);
  const [showGraphs, setShowGraphs] = useState(false);
  const [monthlyData, setMonthlyData] = useState<
    { month: string; minutes: number }[]
  >([]);
  const [monthlySkipData, setMonthlySkipData] = useState<
    { month: string; skipped: number; total: number; skipRate: number }[]
  >([]);
  const [timeOfDayData, setTimeOfDayData] = useState<
    { hour: string; minutes: number }[]
  >([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Check for access token on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("access_token");
    const expiresIn = params.get("expires_in");

    if (accessToken) {
      spotifyApi.setAccessToken(accessToken);
      setIsAuthenticated(true);
      fetchUserProfile();
      fetchRecentHistory();

      // Clear token from URL
      window.history.pushState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSpotifyLogin = () => {
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${
      process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
    }&redirect_uri=${encodeURIComponent(
      process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || ""
    )}&scope=${SPOTIFY_SCOPES.join(
      "%20"
    )}&response_type=token&show_dialog=true`;
    window.location.href = authUrl;
  };

  const fetchUserProfile = async () => {
    try {
      const data = await spotifyApi.getMe();
      setUserProfile(data.body);
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
    }
  };

  const fetchRecentHistory = async () => {
    try {
      // Get recently played tracks
      const recentTracks = await spotifyApi.getMyRecentlyPlayedTracks({
        limit: 50,
      });

      // Convert to your ListeningEntry format
      const historyData = recentTracks.body.items.map((item) => ({
        ts: item.played_at,
        platform: "spotify",
        ms_played: item.track.duration_ms,
        master_metadata_track_name: item.track.name,
        master_metadata_album_artist_name: item.track.artists[0]?.name,
        master_metadata_album_album_name: item.track.album.name,
        spotify_track_uri: item.track.uri,
        reason_start: "playback",
        reason_end: "trackdone",
        shuffle: false,
        skipped: false,
        offline: false,
        offline_timestamp: null,
        incognito_mode: false,
      }));

      setOriginalData(historyData);
      setListeningData(historyData);
      calculateArtistStats(historyData);
      calculateChartData(historyData);
    } catch (err) {
      console.error("Failed to fetch recent history:", err);
    }
  };

  const calculateChartData = (data: ListeningEntry[]) => {
    const monthlyMap = new Map<string, number>();
    const monthlySkipMap = new Map<
      string,
      { skipped: number; total: number }
    >();
    const timeOfDayMap = new Map<string, number>();

    data.forEach((entry) => {
      const date = new Date(entry.ts);
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`;
      const hour = date.getHours();
      const hourLabel = `${hour}:00-${hour + 1}:00`;
      const minutes = msToMinutes(entry.ms_played || 0);

      // Monthly listening time
      monthlyMap.set(monthYear, (monthlyMap.get(monthYear) || 0) + minutes);

      // Monthly skip data
      const skipData = monthlySkipMap.get(monthYear) || {
        skipped: 0,
        total: 0,
      };
      skipData.total += 1;
      if (entry.skipped) skipData.skipped += 1;
      monthlySkipMap.set(monthYear, skipData);

      // Time of day data
      timeOfDayMap.set(hourLabel, (timeOfDayMap.get(hourLabel) || 0) + minutes);
    });

    setMonthlyData(
      Array.from(monthlyMap.entries())
        .map(([month, minutes]) => ({ month, minutes }))
        .sort((a, b) => a.month.localeCompare(b.month))
    );

    setMonthlySkipData(
      Array.from(monthlySkipMap.entries())
        .map(([month, { skipped, total }]) => ({
          month,
          skipped,
          total,
          skipRate: (skipped / total) * 100,
        }))
        .sort((a, b) => a.month.localeCompare(b.month))
    );

    setTimeOfDayData(
      Array.from(timeOfDayMap.entries())
        .map(([hour, minutes]) => ({ hour, minutes }))
        .sort(
          (a, b) =>
            parseInt(a.hour.split(":")[0]) - parseInt(b.hour.split(":")[0])
        )
    );
  };

  const sortByNewest = () => {
    const sortedByDate = [...originalData].sort(
      (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()
    );
    setListeningData(sortedByDate);
    setSortMethod("newest");
    setPage(1);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const fileReaders: Promise<ListeningEntry[]>[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      const promise = new Promise<ListeningEntry[]>((resolve) => {
        reader.onload = (e) => {
          const content = e.target?.result as string;
          const data = JSON.parse(content) as ListeningEntry[];
          resolve(data);
        };
      });

      fileReaders.push(promise);
      reader.readAsText(file);
    }

    Promise.all(fileReaders).then((results) => {
      const combinedData = results.flatMap((result) => result || []);
      const filteredData = combinedData.filter(
        (entry) =>
          entry?.master_metadata_track_name?.trim() &&
          entry?.master_metadata_album_artist_name?.trim() &&
          entry?.spotify_track_uri?.startsWith("spotify:track:")
      );

      const sortedByDate = [...filteredData].sort(
        (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
      );

      setOriginalData(sortedByDate);
      setListeningData(sortedByDate);
      calculateArtistStats(sortedByDate);
      calculateLongestStretch(sortedByDate);
      calculateChartData(sortedByDate);
    });
  };

  const calculateArtistStats = (data: ListeningEntry[]) => {
    const artistMap = new Map<string, number>();

    data.forEach((entry) => {
      const artist =
        entry.master_metadata_album_artist_name || "Unknown Artist";
      const minutes = msToMinutes(entry.ms_played || 0);
      artistMap.set(artist, (artistMap.get(artist) || 0) + minutes);
    });

    setArtistStats(
      Array.from(artistMap.entries()).map(([artist, minutes]) => ({
        artist,
        minutes,
      }))
    );
  };

  const calculateLongestStretch = (data: ListeningEntry[]) => {
    let longestGap = 0;
    let longestStart = "";
    let longestEnd = "";

    for (let i = 1; i < data.length; i++) {
      const prevTimestamp = new Date(data[i - 1].ts).getTime();
      const currentTimestamp = new Date(data[i].ts).getTime();
      const gap = currentTimestamp - prevTimestamp;

      if (gap > longestGap) {
        longestGap = gap;
        longestStart = data[i - 1].ts;
        longestEnd = data[i].ts;
      }
    }

    setLongestStretch({
      start: longestStart,
      end: longestEnd,
      minutes: msToMinutes(longestGap),
    });
  };

  const sortByMostListens = () => {
    setSortMethod("listens");
    const counts = new Map<
      string,
      { count: number; entry: ListeningEntry; totalMsPlayed: number }
    >();

    originalData.forEach((entry) => {
      const trackUri = entry.spotify_track_uri;
      if (trackUri) {
        const existing = counts.get(trackUri) || {
          count: 0,
          entry,
          totalMsPlayed: 0,
        };
        existing.count += 1;
        existing.totalMsPlayed += entry.ms_played || 0;
        counts.set(trackUri, existing);
      }
    });

    const sortedByListens = Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .map((item) => item.entry);

    setListeningData(sortedByListens);
    setTrackListenCounts(counts);
    setPage(1);
  };

  const sortByOldest = () => {
    const sortedByDate = [...originalData].sort(
      (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
    );
    setListeningData(sortedByDate);
    setSortMethod("oldest");
    setPage(1);
  };

  const totalMsPlayed = listeningData.reduce(
    (sum, entry) => sum + (entry.ms_played || 0),
    0
  );
  const totalMinutesPlayed = msToMinutes(totalMsPlayed);
  const totalTracksPlayed = listeningData.filter(
    (entry) => entry.master_metadata_track_name
  ).length;

  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = listeningData.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    if (
      newPage >= 1 &&
      newPage <= Math.ceil(listeningData.length / itemsPerPage)
    ) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="p-4 md:p-6 font-sans max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center">
          <img src={Logo.src} alt="Logo" className="h-10 w-auto rounded-lg" />
          <Label> </Label>
        </div>
        <div className="flex items-center gap-4">
          {userProfile && (
            <div className="hidden md:flex items-center gap-2">
              <Avatar>
                <AvatarImage
                  src={
                    userProfile.images?.[0]?.url ||
                    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRslcO84eWfXP_4Ucd4Yfz6B8uqJmHaTo0iTw&s"
                  }
                />
                <AvatarFallback>
                  {userProfile.display_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <span>{userProfile.display_name}</span>
            </div>
          )}
          {!isAuthenticated ? (
            <Button onClick={handleSpotifyLogin}>Connect Spotify</Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Avatar className="bg-white">
                  <AvatarImage
                    className="bg-white"
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRslcO84eWfXP_4Ucd4Yfz6B8uqJmHaTo0iTw&s"
                  />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>
                  <a
                    href="https://open.spotify.com"
                    className="flex justify-between"
                    target="_blank"
                  >
                    My Spotify
                    {<ExternalLink className="size-3" />}
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem>Help</DropdownMenuItem>
                <DropdownMenuItem>Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* File Upload Section */}
      <div className="flex flex-col items-center mt-4 gap-4">
        {!isAuthenticated ? (
          <Button onClick={handleSpotifyLogin} className="w-full max-w-md">
            Connect Spotify to view your recent history
          </Button>
        ) : (
          <Button
            onClick={fetchRecentHistory}
            variant="outline"
            className="w-full max-w-md"
          >
            Refresh Recent History
          </Button>
        )}

        <p className="opacity-50 text-sm md:text-base text-center">
          Or{" "}
          <input
            type="file"
            accept=".json"
            multiple
            onChange={handleFileUpload}
            className="border-b border-gray-400 bg-transparent cursor-pointer"
          />{" "}
          your extended history
        </p>
        <p className="opacity-50 text-sm md:text-base text-center">
          Need Help?{" "}
          <a href="../howto-page" className="hover:underline">
            <em>
              How to get my <strong>extended</strong> listening history?
            </em>
          </a>
        </p>
      </div>

      {/* Stats Card */}
      <div className="flex justify-center mt-6">
        <Card className="w-full md:w-4/5 lg:w-2/3 bg-[#1ed75fd0] hover:shadow-lg">
          <CardHeader>
            <CardTitle>Your Spotify Listening History</CardTitle>
            <CardDescription></CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <p>Total Minutes Played: {totalMinutesPlayed.toFixed(0)}</p>
              <p>Total Tracks Played: {totalTracksPlayed}</p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              onClick={() => setShowGraphs(!showGraphs)}
              variant="outline"
              className="flex gap-2"
            >
              <BarChart2 className="size-4" />
              {showGraphs ? "Hide Graphs" : "Show Graphs"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Graphs Section */}
      {showGraphs && (
        <div className="space-y-6 mt-6">
          {monthlyData.length > 0 && (
            <div className="flex justify-center">
              <Card className="w-full md:w-4/5 lg:w-2/3">
                <CardHeader>
                  <CardTitle>Monthly Listening Time</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] sm:h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis
                        label={{
                          value: "Minutes",
                          angle: -90,
                          position: "insideLeft",
                        }}
                      />
                      <Tooltip
                        formatter={(value: number) => [
                          `${Math.round(value)} minutes`,
                          "Listening Time",
                        ]}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="minutes"
                        stroke="#8884d8"
                        activeDot={{ r: 8 }}
                        name="Listening Time"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {monthlySkipData.length > 0 && (
            <div className="flex justify-center">
              <Card className="w-full md:w-4/5 lg:w-2/3">
                <CardHeader>
                  <CardTitle>Pickiness Chart (Skipped Songs)</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] sm:h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlySkipData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        stroke="#8884d8"
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#82ca9d"
                      />
                      <Tooltip />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="skipRate"
                        name="Skip Rate (%)"
                        fill="#8884d8"
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="skipped"
                        name="Skipped Songs"
                        fill="#82ca9d"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {timeOfDayData.length > 0 && (
            <div className="flex justify-center">
              <Card className="w-full md:w-4/5 lg:w-2/3">
                <CardHeader>
                  <CardTitle>Listening Time by Hour of Day</CardTitle>
                </CardHeader>
                <CardContent className="h-[400px] sm:h-[500px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={timeOfDayData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="minutes"
                        nameKey="hour"
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {timeOfDayData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [
                          `${Math.round(value)} minutes`,
                          "Listening Time",
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Longest Stretch Section */}
      {longestStretch && (
        <div className="flex justify-center mt-6">
          <Card className="w-full md:w-4/5 lg:w-2/3 bg-[#1ed75fd0] hover:shadow-lg">
            <CardHeader>
              <CardTitle>Longest Stretch Between Listening</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                <strong>Start:</strong> {formatDate(longestStretch.start)}
              </p>
              <p>
                <strong>End:</strong> {formatDate(longestStretch.end)}
              </p>
              <p>
                <strong>Duration:</strong> {longestStretch.minutes.toFixed(0)}{" "}
                minutes
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Listening Entries Section */}
      <div className="mt-8">
        <h2 className="font-bold text-center text-xl md:text-2xl mb-4">
          All Listening Entries
        </h2>
        <div className="flex justify-center">
          <Button
            onClick={() => {
              if (sortMethod === "oldest") sortByNewest();
              else if (sortMethod === "newest") sortByMostListens();
              else sortByOldest();
            }}
            className="mb-6"
          >
            {sortMethod === "oldest" && "Sort by Newest"}
            {sortMethod === "newest" && "Sort by Most Listens"}
            {sortMethod === "listens" && "Sort by Oldest"}
          </Button>
        </div>

        <div className="space-y-3">
          {paginatedData.map((entry, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-md shadow-sm p-3 w-full md:w-4/5 lg:w-3/4 mx-auto hover:bg-[#adadad7f] transition-colors"
            >
              <a
                href={`https://open.spotify.com/search/${encodeURIComponent(
                  entry.master_metadata_track_name || ""
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <p className="font-medium truncate">
                  {entry.master_metadata_track_name || "Unknown Track"}
                </p>
                <p className="text-sm text-gray-600">
                  by{" "}
                  {entry.master_metadata_album_artist_name || "Unknown Artist"}{" "}
                </p>
                {sortMethod !== "listens" && (
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(entry.ts)}
                  </p>
                )}
                {sortMethod === "listens" && (
                  <p className="text-xs text-gray-500 mt-1">
                    Listened{" "}
                    {trackListenCounts.get(entry.spotify_track_uri)?.count || 0}{" "}
                    times, Total:{" "}
                    {msToMinutes(
                      trackListenCounts.get(entry.spotify_track_uri)
                        ?.totalMsPlayed || 0
                    ).toFixed(2)}{" "}
                    min
                  </p>
                )}
              </a>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {listeningData.length > itemsPerPage && (
          <div className="mt-8">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    className={`cursor-pointer ${
                      page === 1 ? "opacity-50 pointer-events-none" : ""
                    }`}
                    onClick={() => handlePageChange(page - 1)}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="cursor-default">
                    Page {page} of{" "}
                    {Math.ceil(listeningData.length / itemsPerPage)}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    className={`cursor-pointer ${
                      page === Math.ceil(listeningData.length / itemsPerPage)
                        ? "opacity-50 pointer-events-none"
                        : ""
                    }`}
                    onClick={() => handlePageChange(page + 1)}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
