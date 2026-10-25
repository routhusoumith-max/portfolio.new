import { useState } from "react";
import { supabase } from "./supabase";

function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    onLogin(data.user);
  }

  return (
    <div className="admin-login">

      <div className="login-card">

        <div className="login-logo">
          SOUMITH
        </div>

        <p className="login-label">
          PORTFOLIO ADMIN
        </p>

        <h1>
          Welcome Back
        </h1>

        <p className="login-description">
          Sign in to manage your portfolio.
        </p>

        <form onSubmit={handleLogin}>

          <input
            type="email"
            placeholder="Admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

        </form>

      </div>

    </div>
  );
}

export default AdminLogin;