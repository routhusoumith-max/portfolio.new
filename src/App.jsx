import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./App.css";

const STORAGE_BUCKET = "portfolio-videos";

const CATEGORIES = [
  "Reel",
  "Cinematic Edit",
  "Short Film",
  "Motion Edit",
  "AI Edit",
  "Instagram Reel",
];

function App() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] =
    useState(false);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const [isResetMode, setIsResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loginError, setLoginError] = useState("");
  const [message, setMessage] = useState("");

  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Reel");
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);

  const isAdminPage = window.location.pathname === "/admin";

  // =========================
  // LOAD PROJECTS
  // =========================

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Project loading error:", error);
      return;
    }

    setProjects(data || []);
  };

  // =========================
  // AUTH LISTENER
  // =========================

  useEffect(() => {
    loadProjects();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);

      if (event === "PASSWORD_RECOVERY") {
        setIsResetMode(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // =========================
  // CLEAR MESSAGES
  // =========================

  const clearMessages = () => {
    setLoginError("");
    setMessage("");
  };

  // =========================
  // LOGIN
  // =========================

  const handleLogin = async (e) => {
    e.preventDefault();

    clearMessages();

    if (!email.trim()) {
      setLoginError("Please enter your email.");
      return;
    }

    if (!password) {
      setLoginError("Please enter your password.");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setLoginError(error.message);
      return;
    }

    setSession(data.session);
    setMessage("Login successful!");
  };

  // =========================
  // CREATE ACCOUNT
  // =========================

  const handleCreateAccount = async (e) => {
    e.preventDefault();

    clearMessages();

    if (!signupEmail.trim()) {
      setLoginError("Please enter your email.");
      return;
    }

    if (signupPassword.length < 6) {
      setLoginError("Password must be at least 6 characters.");
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setLoginError("Passwords do not match.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: signupEmail.trim(),
      password: signupPassword,
    });

    if (error) {
      setLoginError(error.message);
      return;
    }

    setMessage(
      "Account created successfully. Check your email if confirmation is enabled."
    );

    setSignupPassword("");
    setSignupConfirmPassword("");
  };

  // =========================
  // FORGOT PASSWORD
  // =========================

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    clearMessages();

    if (!resetEmail.trim()) {
      setLoginError("Please enter your email.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(
      resetEmail.trim(),
      {
        redirectTo: `${window.location.origin}/admin`,
      }
    );

    if (error) {
      setLoginError(error.message);
      return;
    }

    setMessage(
      "Password reset email sent. Open the email and click the reset link."
    );
  };

  // =========================
  // UPDATE PASSWORD
  // =========================

  const handleUpdatePassword = async () => {
    clearMessages();

    if (!newPassword) {
      setLoginError("Please enter a new password.");
      return;
    }

    if (newPassword.length < 6) {
      setLoginError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setLoginError("Passwords do not match.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setLoginError(error.message);
      return;
    }

    setMessage("Password updated successfully!");

    setNewPassword("");
    setConfirmPassword("");
    setIsResetMode(false);

    window.history.replaceState({}, document.title, "/admin");
  };

  // =========================
  // LOGOUT
  // =========================

  const handleLogout = async () => {
    await supabase.auth.signOut();

    setSession(null);
    clearMessages();

    window.location.href = "/";
  };

  // =========================
  // UPLOAD PROJECT
  // =========================

  const handleUpload = async (e) => {
    e.preventDefault();

    clearMessages();

    if (!title.trim()) {
      alert("Please enter a project title.");
      return;
    }

    if (!videoFile) {
      alert("Please select a video.");
      return;
    }

    try {
      setUploading(true);

      // -------------------------
      // VIDEO
      // -------------------------

      const videoExtension =
        videoFile.name.split(".").pop()?.toLowerCase() || "mp4";

      const videoPath = `videos/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${videoExtension}`;

      const { error: videoError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(videoPath, videoFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (videoError) {
        throw videoError;
      }

      const { data: videoData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(videoPath);

      const videoUrl = videoData.publicUrl;

      // -------------------------
      // THUMBNAIL
      // -------------------------

      let thumbnailUrl = "";

      if (thumbnailFile) {
        const thumbnailExtension =
          thumbnailFile.name.split(".").pop()?.toLowerCase() || "jpg";

        const thumbnailPath = `thumbnails/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${thumbnailExtension}`;

        const { error: thumbnailError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(thumbnailPath, thumbnailFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (thumbnailError) {
          throw thumbnailError;
        }

        const { data: thumbnailData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(thumbnailPath);

        thumbnailUrl = thumbnailData.publicUrl;
      }

      // -------------------------
      // DATABASE
      // -------------------------

      const { error: databaseError } = await supabase
        .from("projects")
        .insert([
          {
            title: title.trim(),
            category,
            description: description.trim(),
            video_url: videoUrl,
            thumbnail_url: thumbnailUrl,
            published: true,
          },
        ]);

      if (databaseError) {
        throw databaseError;
      }

      // -------------------------
      // RESET FORM
      // -------------------------

      setTitle("");
      setCategory("Reel");
      setDescription("");
      setVideoFile(null);
      setThumbnailFile(null);

      const videoInput = document.getElementById("videoInput");

      if (videoInput) {
        videoInput.value = "";
      }

      const thumbnailInput = document.getElementById("thumbnailInput");

      if (thumbnailInput) {
        thumbnailInput.value = "";
      }

      await loadProjects();

      setMessage("Video uploaded successfully!");
    } catch (error) {
      console.error("UPLOAD ERROR:", error);

      alert(error.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // =========================
  // DELETE PROJECT
  // =========================

  const deleteProject = async (project) => {
    const confirmed = window.confirm(
      `Delete "${project.title}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", project.id);

      if (error) {
        throw error;
      }

      await loadProjects();

      setMessage("Project deleted successfully.");
    } catch (error) {
      console.error("DELETE ERROR:", error);

      alert(error.message || "Could not delete project.");
    }
  };

  const closeMobileMenu = () => {
    setMobileMenu(false);
  };

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-orb" />
        <div>Loading Portfolio...</div>
      </div>
    );
  }

  // =========================
  // PASSWORD RESET
  // =========================

  if (isResetMode) {
    return (
      <AuthShell
        title="Create New Password"
        subtitle="Set a new password for your portfolio admin account."
      >
        {loginError && (
          <div className="alert error">
            {loginError}
          </div>
        )}

        {message && (
          <div className="alert success">
            {message}
          </div>
        )}

        <PasswordInput
          value={newPassword}
          setValue={setNewPassword}
          show={showNewPassword}
          setShow={setShowNewPassword}
          placeholder="New Password"
        />

        <PasswordInput
          value={confirmPassword}
          setValue={setConfirmPassword}
          show={showConfirmPassword}
          setShow={setShowConfirmPassword}
          placeholder="Confirm New Password"
        />

        <button
          className="auth-primary"
          onClick={handleUpdatePassword}
        >
          Update Password
        </button>

        <button
          className="text-button"
          onClick={() => {
            setIsResetMode(false);
            clearMessages();
          }}
        >
          ← Back to Login
        </button>
      </AuthShell>
    );
  }

  // =========================
  // ADMIN PAGE
  // =========================

  if (isAdminPage) {
    // -------------------------
    // CREATE ACCOUNT
    // -------------------------

    if (showCreateAccount) {
      return (
        <AuthShell
          title="Create New Account"
          subtitle="Create your portfolio admin account."
        >
          {loginError && (
            <div className="alert error">
              {loginError}
            </div>
          )}

          {message && (
            <div className="alert success">
              {message}
            </div>
          )}

          <form
            onSubmit={handleCreateAccount}
            className="auth-form"
          >
            <input
              className="field"
              type="email"
              placeholder="Email"
              value={signupEmail}
              onChange={(e) =>
                setSignupEmail(e.target.value)
              }
            />

            <PasswordInput
              value={signupPassword}
              setValue={setSignupPassword}
              show={showSignupPassword}
              setShow={setShowSignupPassword}
              placeholder="Create Password"
            />

            <PasswordInput
              value={signupConfirmPassword}
              setValue={setSignupConfirmPassword}
              show={showSignupConfirmPassword}
              setShow={setShowSignupConfirmPassword}
              placeholder="Confirm Password"
            />

            <button
              className="auth-primary"
              type="submit"
            >
              Create Account
            </button>
          </form>

          <button
            className="text-button"
            onClick={() => {
              setShowCreateAccount(false);
              clearMessages();
            }}
          >
            ← Back to Login
          </button>
        </AuthShell>
      );
    }

    // -------------------------
    // FORGOT PASSWORD
    // -------------------------

    if (showForgotPassword) {
      return (
        <AuthShell
          title="Reset Password"
          subtitle="Enter your email and we'll send you a password reset link."
        >
          {loginError && (
            <div className="alert error">
              {loginError}
            </div>
          )}

          {message && (
            <div className="alert success">
              {message}
            </div>
          )}

          <form
            onSubmit={handleForgotPassword}
            className="auth-form"
          >
            <input
              className="field"
              type="email"
              placeholder="Your Email"
              value={resetEmail}
              onChange={(e) =>
                setResetEmail(e.target.value)
              }
            />

            <button
              className="auth-primary"
              type="submit"
            >
              Send Reset Link
            </button>
          </form>

          <button
            className="text-button"
            onClick={() => {
              setShowForgotPassword(false);
              clearMessages();
            }}
          >
            ← Back to Login
          </button>
        </AuthShell>
      );
    }

    // -------------------------
    // LOGIN
    // -------------------------

    if (!session) {
      return (
        <AuthShell
          title="Welcome Back"
          subtitle="Login to manage your video portfolio."
        >
          {loginError && (
            <div className="alert error">
              {loginError}
            </div>
          )}

          {message && (
            <div className="alert success">
              {message}
            </div>
          )}

          <form
            onSubmit={handleLogin}
            className="auth-form"
          >
            <input
              className="field"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />

            <PasswordInput
              value={password}
              setValue={setPassword}
              show={showPassword}
              setShow={setShowPassword}
              placeholder="Password"
            />

            <button
              className="auth-primary"
              type="submit"
            >
              Login
            </button>
          </form>

          <button
            className="text-button"
            onClick={() => {
              setShowForgotPassword(true);
              setResetEmail(email);
              clearMessages();
            }}
          >
            Forgot Password?
          </button>

          <button
            className="outline-button"
            onClick={() => {
              setShowCreateAccount(true);
              clearMessages();
            }}
          >
            Create New Account
          </button>

          <button
            className="text-button"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            ← Back to Portfolio
          </button>
        </AuthShell>
      );
    }

    // -------------------------
    // ADMIN DASHBOARD
    // -------------------------

    return (
      <div className="admin-page">
        <nav className="admin-nav">
          <a
            href="/"
            className="brand"
          >
            <span className="brand-mark">S</span>
            <span>SOUMITH</span>
          </a>

          <div className="admin-nav-right">
            <span className="admin-badge">
              ADMIN
            </span>

            <button
              className="logout-button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </nav>

        <main className="admin-container">
          <div className="admin-heading">
            <div>
              <span className="eyebrow">
                CREATOR STUDIO
              </span>

              <h1>
                Portfolio Dashboard
              </h1>

              <p>
                Upload and manage your latest
                video work.
              </p>
            </div>

            <a
              className="view-site-button"
              href="/"
            >
              View Portfolio ↗
            </a>
          </div>

          {message && (
            <div className="alert success">
              {message}
            </div>
          )}

          <div className="admin-layout">
            {/* UPLOAD PANEL */}

            <section className="panel upload-panel">
              <div className="panel-heading">
                <span className="panel-icon">
                  ＋
                </span>

                <div>
                  <h2>
                    Add New Project
                  </h2>

                  <p>
                    Publish a new edit to your
                    portfolio.
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleUpload}
                className="upload-form"
              >
                <div className="field-group">
                  <label>
                    Project title
                  </label>

                  <input
                    className="field"
                    type="text"
                    placeholder="e.g. Cinematic Travel Reel"
                    value={title}
                    onChange={(e) =>
                      setTitle(e.target.value)
                    }
                  />
                </div>

                <div className="field-group">
                  <label>
                    Category
                  </label>

                  <select
                    className="field"
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value)
                    }
                  >
                    {CATEGORIES.map((item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field-group">
                  <label>
                    Description
                  </label>

                  <textarea
                    className="field textarea"
                    placeholder="Short description of the edit"
                    value={description}
                    onChange={(e) =>
                      setDescription(e.target.value)
                    }
                  />
                </div>

                <div className="file-grid">
                  <label className="file-drop">
                    <span className="file-icon">
                      ▶
                    </span>

                    <strong>
                      Video
                    </strong>

                    <small>
                      {videoFile
                        ? videoFile.name
                        : "Choose MP4 or video"}
                    </small>

                    <input
                      id="videoInput"
                      type="file"
                      accept="video/*"
                      onChange={(e) =>
                        setVideoFile(
                          e.target.files?.[0] ||
                            null
                        )
                      }
                    />
                  </label>

                  <label className="file-drop">
                    <span className="file-icon">
                      ▧
                    </span>

                    <strong>
                      Thumbnail
                    </strong>

                    <small>
                      {thumbnailFile
                        ? thumbnailFile.name
                        : "Optional image"}
                    </small>

                    <input
                      id="thumbnailInput"
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setThumbnailFile(
                          e.target.files?.[0] ||
                            null
                        )
                      }
                    />
                  </label>
                </div>

                <button
                  className="publish-button"
                  type="submit"
                  disabled={uploading}
                >
                  {uploading
                    ? "Uploading..."
                    : "Publish Project →"}
                </button>
              </form>
            </section>

            {/* PROJECTS PANEL */}

            <section className="panel projects-panel">
              <div className="panel-heading">
                <span className="panel-icon">
                  ▦
                </span>

                <div>
                  <h2>
                    Your Projects
                  </h2>

                  <p>
                    {projects.length} published
                    project
                    {projects.length === 1
                      ? ""
                      : "s"}
                  </p>
                </div>
              </div>

              <div className="admin-project-list">
                {projects.length === 0 ? (
                  <div className="empty-admin">
                    <div>◌</div>

                    <p>
                      No projects uploaded yet.
                    </p>
                  </div>
                ) : (
                  projects.map((project) => (
                    <article
                      className="admin-project-card"
                      key={project.id}
                    >
                      <div className="admin-project-media">
                        {project.thumbnail_url ? (
                          <img
                            src={project.thumbnail_url}
                            alt={project.title}
                          />
                        ) : (
                          <video
                            src={project.video_url}
                            controls
                            preload="metadata"
                          />
                        )}
                      </div>

                      <div className="admin-project-info">
                        <span className="category-pill">
                          {project.category}
                        </span>

                        <h3>
                          {project.title}
                        </h3>

                        {project.description && (
                          <p>
                            {project.description}
                          </p>
                        )}

                        <button
                          className="delete-button"
                          onClick={() =>
                            deleteProject(project)
                          }
                        >
                          Delete Project
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    );
  }

  // =========================
  // PUBLIC PORTFOLIO
  // =========================

  return (
    <div className="portfolio-page">
      {/* NAVBAR */}

      <nav className="navbar">
        <a
          href="#home"
          className="brand"
          onClick={closeMobileMenu}
        >
          <span className="brand-mark">
            S
          </span>

          <span>
            SOUMITH
          </span>
        </a>

        <div
          className={`nav-links ${
            mobileMenu ? "open" : ""
          }`}
        >
          <a
            href="#home"
            onClick={closeMobileMenu}
          >
            Home
          </a>

          <a
            href="#work"
            onClick={closeMobileMenu}
          >
            Works
          </a>

          <a
            href="#about"
            onClick={closeMobileMenu}
          >
            About
          </a>

          <a
            href="#services"
            onClick={closeMobileMenu}
          >
            Services
          </a>

          <a
            href="#contact"
            onClick={closeMobileMenu}
          >
            Contact
          </a>

          <a
            className="nav-admin"
            href="/admin"
          >
            Admin
          </a>
        </div>

        <button
          className="mobile-menu-button"
          onClick={() =>
            setMobileMenu((value) => !value)
          }
          aria-label="Toggle navigation"
        >
          {mobileMenu ? "×" : "☰"}
        </button>
      </nav>

      <main>
        {/* HERO */}

        <section
          id="home"
          className="hero-section"
        >
          <div className="hero-grid" />

          <div className="hero-orb orb-one" />
          <div className="hero-orb orb-two" />

          <div className="hero-content">
            <div className="availability">
              <span />
              Available for creative projects
            </div>

            <span className="eyebrow">
              VIDEO EDITOR · CREATIVE · AI
            </span>

            <h1>
              Turning raw footage
              <br />
              into{" "}
              <span>
                visual stories.
              </span>
            </h1>

            <p>
              Professional video editing,
              cinematic storytelling, motion
              design and AI-powered creative
              edits.
            </p>

            <div className="hero-actions">
              <a
                className="primary-button"
                href="#work"
              >
                Explore My Work{" "}
                <span>↗</span>
              </a>

              <a
                className="secondary-button"
                href="#contact"
              >
                Let's Connect
              </a>
            </div>

            <div className="hero-tools">
              <span>
                Premiere pro
              </span>

              <span>
                Photoshop
              </span>

              <span>
                CapCut
              </span>

              <span>
                AI Creative Tools
              </span>
            </div>
          </div>

          <div className="scroll-cue">
            SCROLL <span>↓</span>
          </div>
        </section>

        {/* WORK */}

        <section
          id="work"
          className="section work-section"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                SELECTED WORK
              </span>

              <h2>
                Projects that{" "}
                <span>
                  move.
                </span>
              </h2>
            </div>

            <span className="project-count">
              {projects.length
                .toString()
                .padStart(2, "0")}{" "}
              PROJECTS
            </span>
          </div>

          {projects.length === 0 ? (
            <div className="empty-state">
              <h3>
                Projects coming soon.
              </h3>

              <p>
                New edits will appear here
                after you publish them from
                the admin dashboard.
              </p>
            </div>
          ) : (
            <div className="project-grid">
              {projects.map(
                (project, index) => (
                  <article
                    className="project-card"
                    key={project.id}
                  >
                    <div className="project-media">
                      {project.thumbnail_url ? (
                        <img
                          src={
                            project.thumbnail_url
                          }
                          alt={
                            project.title
                          }
                        />
                      ) : (
                        <video
                          src={
                            project.video_url
                          }
                          controls
                          preload="metadata"
                        />
                      )}

                      <div className="project-number">
                        {String(index + 1).padStart(
                          2,
                          "0"
                        )}
                      </div>
                    </div>

                    <div className="project-body">
                      <span className="category-pill">
                        {project.category}
                      </span>

                      <h3>
                        {project.title}
                      </h3>

                      {project.description && (
                        <p>
                          {project.description}
                        </p>
                      )}
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>

        {/* ABOUT */}

        <section
          id="about"
          className="section about-section"
        >
          <div className="about-layout">
            <div>
              <span className="eyebrow">
                ABOUT ME
              </span>

              <h2>
                Creative editing.
                <br />
                <span>
                  Technical thinking.
                </span>
              </h2>
            </div>

            <div className="about-copy">
              <p>
                I'm Soumith, a video editor
                focused on creating engaging
                cinematic, social-media and
                AI-powered content. I combine
                editing, storytelling and
                technology to turn ideas into
                impactful visuals.
              </p>

              <div className="skill-list">
                <span>
                  Video Editing
                </span>

                <span>
                  Cinematic Storytelling
                </span>

                <span>
                  Motion Design
                </span>

                <span>
                  AI Creative
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICES */}

        <section
          id="services"
          className="section services-section"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                WHAT I DO
              </span>

              <h2>
                Built for{" "}
                <span>
                  impact.
                </span>
              </h2>
            </div>
          </div>

          <div className="service-grid">
            <div className="service-card">
              <span>01</span>

              <h3>
                Reels & Short Form
              </h3>

              <p>
                Fast-paced social edits
                designed to hold attention
                and communicate clearly.
              </p>
            </div>

            <div className="service-card">
              <span>02</span>

              <h3>
                Cinematic Edits
              </h3>

              <p>
                Story-driven edits with
                pacing, sound and visual
                treatment for a polished
                finish.
              </p>
            </div>

            <div className="service-card">
              <span>03</span>

              <h3>
                AI Creative
              </h3>

              <p>
                AI-assisted visuals and
                creative workflows combined
                with human editing.
              </p>
            </div>
          </div>
        </section>

        {/* CONTACT */}

        <section
          id="contact"
          className="section contact-section"
        >
          <div className="contact-card">
            <span className="eyebrow">
              CONTACT
            </span>

            <h2>
              Have a story
              <br />
              <span>
                to tell?
              </span>
            </h2>

            <p>
              Let's turn your footage into
              something people remember.
            </p>

            <a
              className="primary-button"
              href="mailto:hello@example.com"
            >
              Start a Conversation ↗
            </a>
          </div>
        </section>
      </main>

      {/* FOOTER */}

      <footer className="footer">
        <div>
          <strong>
            SOUMITH
          </strong>

          <span>
            Video Editor · Creative · AI
          </span>
        </div>

        <div className="footer-links">
          <a href="#home">
            Home
          </a>

          <a href="#work">
            Works
          </a>

          <a href="#about">
            About
          </a>

          <a href="/admin">
            Admin
          </a>
        </div>

        <p>
          © {new Date().getFullYear()}{" "}
          Soumith. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

// =========================
// AUTH SHELL
// =========================

function AuthShell({
  title,
  subtitle,
  children,
}) {
  return (
    <div className="auth-page">
      <div className="auth-glow" />

      <div className="auth-card">
        <a
          href="/"
          className="auth-logo"
        >
          <span className="brand-mark">
            S
          </span>

          <span>
            SOUMITH
          </span>
        </a>

        <span className="eyebrow">
          PORTFOLIO ADMIN
        </span>

        <h1>
          {title}
        </h1>

        <p className="auth-subtitle">
          {subtitle}
        </p>

        {children}
      </div>
    </div>
  );
}

// =========================
// PASSWORD INPUT
// =========================

function PasswordInput({
  value,
  setValue,
  show,
  setShow,
  placeholder,
}) {
  return (
    <div className="password-field">
      <input
        className="field"
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) =>
          setValue(e.target.value)
        }
      />

      <button
        type="button"
        onClick={() =>
          setShow((value) => !value)
        }
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

export default App;