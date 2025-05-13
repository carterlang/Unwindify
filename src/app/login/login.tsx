// app/login/page.tsx
"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("from") || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Replace with your actual authentication logic
      const response = await authenticateUser(email, password);

      if (response.success) {
        // Set auth cookie (matches what middleware checks for)
        document.cookie = `authToken=${response.token}; path=/; max-age=${
          60 * 60 * 24 * 7
        }; Secure; SameSite=Lax`;

        // Redirect to the originally requested page or dashboard
        router.push(redirectTo);
      } else {
        setError(response.message || "Invalid credentials");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Mock authentication function - replace with your real auth logic
  const authenticateUser = async (email: string, password: string) => {
    // In a real app, you would call your authentication API here
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate network delay

    // Demo authentication - in production, verify against your database
    const validUsers = [{ email: "user@example.com", password: "password123" }];

    const user = validUsers.find(
      (u) => u.email === email && u.password === password
    );

    if (user) {
      return {
        success: true,
        token: "demo-auth-token-12345", // In real app, use JWT or session token
        user: { email: user.email },
      };
    }

    return { success: false, message: "Invalid email or password" };
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Spotify Analytics Login
          </CardTitle>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>

            <div className="text-center text-sm text-gray-500">
              Demo credentials: user@example.com / password123
            </div>

            <div className="text-center text-sm">
              <span className="text-gray-500">Don't have an account?</span>{" "}
              <Button variant="link" className="p-0 h-auto" type="button">
                Contact admin
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
