import React, { useState, useEffect } from "react";
import { authClient } from "./auth-client";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState<any>(null);
  const [isPending, setIsPending] = useState(true);

  // Get current session manually
  useEffect(() => {
    const checkSession = async () => {
      try {
        setIsPending(true);
        console.log("Checking session...");

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Session check timeout")), 5000),
        );

        const sessionPromise = authClient.getSession();
        const sessionData = await Promise.race([
          sessionPromise,
          timeoutPromise,
        ]);

        console.log("Session data:", sessionData);
        console.log(
          "Session data structure:",
          JSON.stringify(sessionData, null, 2),
        );
        console.log("Session user:", sessionData?.user);
        console.log("Session data.user:", sessionData?.data?.user);
        console.log("Session has user:", !!sessionData?.user);
        console.log("Session has data.user:", !!sessionData?.data?.user);
        setSession(sessionData);
      } catch (err) {
        console.error("Session check error:", err);
        setSession(null);
      } finally {
        setIsPending(false);
      }
    };

    checkSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      console.log("Attempting login with:", { email, password });
      const loginResult = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/",
      });
      console.log("Login result:", loginResult);

      // Refresh session after successful login
      const sessionData = await authClient.getSession();
      console.log("Session after login:", sessionData);
      setSession(sessionData);
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authClient.signOut();
      setSession(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (isPending) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "18px",
          flexDirection: "column",
        }}
      >
        <div>Loading...</div>
        <div style={{ fontSize: "14px", marginTop: "10px", color: "#666" }}>
          Checking authentication status...
        </div>
        <div style={{ fontSize: "12px", marginTop: "20px", color: "#999" }}>
          If this takes too long, check the browser console for errors
        </div>
      </div>
    );
  }

  if (session?.data?.user || session?.user) {
    return (
      <div
        style={{
          padding: "20px",
          maxWidth: "600px",
          margin: "0 auto",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h1>React Admin - Better Auth Demo</h1>
        <div
          style={{
            background: "#f0f0f0",
            padding: "20px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          <h2>Welcome!</h2>
          <p>
            <strong>Name:</strong> {(session.data?.user || session.user)?.name}
          </p>
          <p>
            <strong>Email:</strong>{" "}
            {(session.data?.user || session.user)?.email}
          </p>
          <p>
            <strong>User ID:</strong> {(session.data?.user || session.user)?.id}
          </p>
          <p>
            <strong>Role:</strong>{" "}
            {(session.data?.user || session.user)?.role || "No role set"}
          </p>
        </div>

        <button
          onClick={handleLogout}
          style={{
            background: "#dc3545",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          Logout
        </button>

        <div
          style={{
            marginTop: "20px",
            padding: "10px",
            background: "#e7f3ff",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        >
          <strong>Note:</strong> This app is running on localhost:3001 and
          sharing authentication with the main app on localhost:3000. If you
          logout here, you'll be logged out of both apps.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "400px",
        margin: "0 auto",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>React Admin - Better Auth Demo</h1>
      <p>Please log in to continue.</p>

      <form onSubmit={handleLogin} style={{ marginTop: "20px" }}>
        <div style={{ marginBottom: "15px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            Email:
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "16px",
            }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            Password:
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "16px",
            }}
          />
        </div>

        {error && (
          <div
            style={{
              color: "#dc3545",
              marginBottom: "15px",
              padding: "10px",
              background: "#f8d7da",
              border: "1px solid #f5c6cb",
              borderRadius: "4px",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            background: loading ? "#6c757d" : "#007bff",
            color: "white",
            border: "none",
            padding: "10px",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "16px",
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <div
        style={{
          marginTop: "20px",
          padding: "10px",
          background: "#e7f3ff",
          borderRadius: "4px",
          fontSize: "14px",
        }}
      >
        <strong>Note:</strong> This app connects to the main app's
        authentication system. Use the same credentials you use for the main
        app.
      </div>

      <div
        style={{
          marginTop: "10px",
          padding: "10px",
          background: "#f8f9fa",
          borderRadius: "4px",
          fontSize: "12px",
          color: "#666",
        }}
      >
        <strong>Debug Info:</strong>
        <br />
        React Admin running on: {window.location.origin}
        <br />
        Connecting to: http://localhost:3001/api/auth
        <br />
        Session status: {session ? "Found" : "Not found"}
        <br />
        Has user: {session?.data?.user || session?.user ? "Yes" : "No"}
        <br />
        User data:{" "}
        {JSON.stringify(session?.data?.user || session?.user, null, 2)}
      </div>
    </div>
  );
}

export default App;
