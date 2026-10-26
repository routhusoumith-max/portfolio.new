import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./App.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const STORAGE_BUCKET = "portfolio-videos";

const CATEGORIES = [
  "All",
  "Reel",
  "Cinematic Edit",
  "Short Film",
  "Motion Edit",
  "AI Edit",
  "Instagram Reel",
];

export default function App() {
  const [projects, setProjects] = useState([]);
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);

  const [session, setSession] = useState(null);
  const [page, setPage] = useState(
    window.location.pathname.startsWith("/admin") ? "admin" : "home"
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [signupMode, setSignupMode] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");

  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const [resetMode, setResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Reel");
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [uploading, setUploading] = useState(false);

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
        setResetMode(true);
        setPage("admin");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      document.documentElement.style.setProperty(
        "--mouse-x",
        `${e.clientX}px`
      );

      document.documentElement.style.setProperty(
        "--mouse-y",
        `${e.clientY}px`
      );
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false });

    if (!error) {
      setProjects(data || []);
    }

    setLoading(false);
  };

  const filteredProjects =
    category === "All"
      ? projects
      : projects.filter((project) => project.category === category);

  const showHome = () => {
    setPage("home");
    window.history.pushState({}, "", "/");
  };

  const showAdmin = () => {
    setPage("admin");
    window.history.pushState({}, "", "/admin");
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      console.error(error);
      setError(error.message);
      return;
    }

    setSession(data.session);
    setMessage("Login successful.");
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!signupEmail.trim()) {
      setError("Enter your email.");
      return;
    }

    if (signupPassword.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (signupPassword !== signupConfirm) {
      setError("Passwords do not match.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: signupEmail.trim(),
      password: signupPassword,
    });

    if (error) {
      setError(error.message);
      return;
    }

    if (data.session) {
      setSession(data.session);
      setMessage("Account created successfully.");
    } else {
      setMessage(
        "Account created. Check your email if confirmation is enabled."
      );
    }

    setSignupPassword("");
    setSignupConfirm("");
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!resetEmail.trim()) {
      setError("Enter your email.");
      return;
    }

    const redirectUrl = `${window.location.origin}/admin`;

    const { error } = await supabase.auth.resetPasswordForEmail(
      resetEmail.trim(),
      {
        redirectTo: redirectUrl,
      }
    );

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Password reset email sent.");
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (newPassword.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Password updated successfully.");

    setNewPassword("");
    setConfirmNewPassword("");
    setResetMode(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setMessage("Logged out.");
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!title.trim()) {
      setError("Enter a project title.");
      return;
    }

    if (!videoFile) {
      setError("Select a video.");
      return;
    }

    setUploading(true);

    try {
      const cleanName = videoFile.name
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9._-]/g, "");

      const videoPath = `videos/${Date.now()}-${cleanName}`;

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

      let thumbnailUrl = "";

      if (thumbnailFile) {
        const cleanThumb = thumbnailFile.name
          .replace(/\s+/g, "-")
          .replace(/[^a-zA-Z0-9._-]/g, "");

        const thumbnailPath = `thumbnails/${Date.now()}-${cleanThumb}`;

        const { error: thumbError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(thumbnailPath, thumbnailFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (!thumbError) {
          const { data: thumbData } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(thumbnailPath);

          thumbnailUrl = thumbData.publicUrl;
        }
      }

      const { error: databaseError } = await supabase
        .from("projects")
        .insert([
          {
            title: title.trim(),
            category: uploadCategory,
            description: description.trim(),
            video_url: videoData.publicUrl,
            thumbnail_url: thumbnailUrl,
            published: true,
          },
        ]);

      if (databaseError) {
        throw databaseError;
      }

      setTitle("");
      setDescription("");
      setVideoFile(null);
      setThumbnailFile(null);

      const videoInput = document.getElementById("videoInput");
      const thumbnailInput = document.getElementById("thumbnailInput");

      if (videoInput) videoInput.value = "";
      if (thumbnailInput) thumbnailInput.value = "";

      setMessage("Video published successfully.");

      await loadProjects();
    } catch (err) {
      console.error(err);
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (project) => {
    const confirmed = window.confirm(
      `Delete "${project.title}" from your portfolio?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", project.id);

    if (error) {
      setError(error.message);
      return;
    }

    setProjects((current) =>
      current.filter((item) => item.id !== project.id)
    );

    setMessage("Project deleted.");
  };

  const handleCardMove = (e) => {
    const card = e.currentTarget;

    const rect = card.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rotateX = ((y / rect.height) - 0.5) * -8;
    const rotateY = ((x / rect.width) - 0.5) * 8;

    card.style.transform = `
      perspective(1000px)
      rotateX(${rotateX}deg)
      rotateY(${rotateY}deg)
      translateY(-8px)
    `;
  };

  const resetCard = (e) => {
    e.currentTarget.style.transform = "";
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader-orb"></div>
        <p>Loading portfolio...</p>
      </div>
    );
  }


  if (page === "admin") {
    return (
      <div className="app">
        <div className="cursor-glow"></div>

        <nav className="navbar">
          <button className="logo" onClick={showHome}>
            <span>RS</span>
            <strong>ROUTHU SOUMITH</strong>
          </button>

          <button className="nav-button" onClick={showHome}>
            ← Portfolio
          </button>
        </nav>

        <main className="admin-page">
          {!session ? (
            <div className="auth-card glass-card">
              <div className="auth-orb"></div>

              <div className="auth-heading">
                <span className="eyebrow">PRIVATE AREA</span>
                <h1>
                  {resetMode
                    ? "Create new password"
                    : signupMode
                    ? "Create account"
                    : forgotMode
                    ? "Reset password"
                    : "Admin login"}
                </h1>

                <p>
                  Manage your video portfolio from one professional dashboard.
                </p>
              </div>

              {error && <div className="alert error">{error}</div>}
              {message && <div className="alert success">{message}</div>}

              {resetMode ? (
                <form onSubmit={handleUpdatePassword} className="auth-form">
                  <label>New password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                  />

                  <label>Confirm password</label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) =>
                      setConfirmNewPassword(e.target.value)
                    }
                    placeholder="Confirm password"
                  />

                  <button className="primary-button" type="submit">
                    Update Password
                  </button>
                </form>
              ) : forgotMode ? (
                <form onSubmit={handleForgotPassword} className="auth-form">
                  <label>Email address</label>

                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="you@example.com"
                  />

                  <button className="primary-button" type="submit">
                    Send Reset Email
                  </button>

                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setForgotMode(false);
                      setError("");
                      setMessage("");
                    }}
                  >
                    Back to Login
                  </button>
                </form>
              ) : signupMode ? (
                <form onSubmit={handleSignup} className="auth-form">
                  <label>Email address</label>

                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="you@example.com"
                  />

                  <label>Password</label>

                  <input
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                  />

                  <label>Confirm password</label>

                  <input
                    type="password"
                    value={signupConfirm}
                    onChange={(e) => setSignupConfirm(e.target.value)}
                    placeholder="Confirm password"
                  />

                  <button className="primary-button" type="submit">
                    Create Account
                  </button>

                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setSignupMode(false);
                      setError("");
                      setMessage("");
                    }}
                  >
                    Already have an account? Login
                  </button>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="auth-form">
                  <label>Email address</label>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />

                  <label>Password</label>

                  <div className="password-box">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your password"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>

                  <button className="primary-button" type="submit">
                    Login
                  </button>

                  <div className="auth-links">
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        setForgotMode(true);
                        setError("");
                        setMessage("");
                      }}
                    >
                      Forgot Password?
                    </button>

                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        setSignupMode(true);
                        setError("");
                        setMessage("");
                      }}
                    >
                      Create New Account
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <AdminDashboard
              projects={projects}
              title={title}
              setTitle={setTitle}
              uploadCategory={uploadCategory}
              setUploadCategory={setUploadCategory}
              description={description}
              setDescription={setDescription}
              videoFile={videoFile}
              setVideoFile={setVideoFile}
              thumbnailFile={thumbnailFile}
              setThumbnailFile={setThumbnailFile}
              uploading={uploading}
              handleUpload={handleUpload}
              handleDelete={handleDelete}
              handleLogout={handleLogout}
              message={message}
              error={error}
            />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="cursor-glow"></div>

      <nav className="navbar">
        <button className="logo" onClick={showHome}>
          <span>RS</span>
          <strong>ROUTHU SOUMITH</strong>
        </button>

        <div className="nav-links">
          <a href="#work">Work</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>

          <button className="nav-button" onClick={showAdmin}>
            Admin
          </button>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="hero-grid"></div>

          <div className="floating-shape shape-one"></div>
          <div className="floating-shape shape-two"></div>
          <div className="floating-shape shape-three"></div>

          <div className="hero-content">
            <span className="eyebrow">VIDEO EDITOR • CREATIVE DESIGNER</span>

            <h1>
              Turning raw footage into
              <span> visual stories.</span>
            </h1>

            <p>
              Cinematic edits, reels, motion design and AI-powered creative
              work crafted with precision.
            </p>

            <div className="hero-buttons">
              <a href="#work" className="primary-button">
                Explore My Work
              </a>

              <a href="#contact" className="secondary-button">
                Let's Work Together
              </a>
            </div>
          </div>

          <div className="hero-3d">
            <div className="cube">
              <div className="cube-face front">EDIT</div>
              <div className="cube-face back">CREATE</div>
              <div className="cube-face right">CUT</div>
              <div className="cube-face left">DESIGN</div>
              <div className="cube-face top">RS</div>
              <div className="cube-face bottom">VIDEO</div>
            </div>
          </div>

          <div className="scroll-indicator">
            <span></span>
            Scroll to explore
          </div>
        </section>

        <section className="stats-section">
          <div>
            <strong>{projects.length.toString().padStart(2, "0")}</strong>
            <span>Projects</span>
          </div>

          <div>
            <strong>06</strong>
            <span>Creative Categories</span>
          </div>

          <div>
            <strong>24/7</strong>
            <span>Creative Mindset</span>
          </div>
        </section>

        <section id="work" className="work-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">SELECTED WORK</span>
              <h2>My creative universe.</h2>
            </div>

            <p>
              A collection of edits, experiments and visual stories.
            </p>
          </div>

          <div className="category-bar">
            {CATEGORIES.map((item) => (
              <button
                key={item}
                className={category === item ? "active" : ""}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="empty-state">Loading projects...</div>
          ) : filteredProjects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✦</div>
              <h3>No projects yet</h3>
              <p>
                Login to the admin dashboard and upload your first project.
              </p>
            </div>
          ) : (
            <div className="project-grid">
              {filteredProjects.map((project, index) => (
                <article
                  className="project-card"
                  key={project.id}
                  onMouseMove={handleCardMove}
                  onMouseLeave={resetCard}
                >
                  <div className="project-number">
                    {(index + 1).toString().padStart(2, "0")}
                  </div>

                  <div className="video-wrapper">
                    <video
                      src={project.video_url}
                      controls
                      preload="metadata"
                      poster={project.thumbnail_url || undefined}
                    />
                  </div>

                  <div className="project-info">
                    <div>
                      <span className="project-category">
                        {project.category}
                      </span>

                      <h3>{project.title}</h3>

                      {project.description && (
                        <p>{project.description}</p>
                      )}
                    </div>

                    <span className="project-arrow">↗</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="about" className="about-section">
          <div className="about-card">
            <span className="eyebrow">ABOUT ME</span>

            <h2>
              Creativity meets
              <span> technology.</span>
            </h2>

            <p>
              I'm Routhu Soumith, a video editor focused on creating
              cinematic, engaging and modern visual experiences. I work with
              Premiere Pro, Photoshop, CapCut and AI-powered creative tools.
            </p>

            <div className="tools">
              <span>Premiere Pro</span>
              <span>Photoshop</span>
              <span>CapCut</span>
              <span>AI Tools</span>
              <span>Motion Design</span>
            </div>
          </div>
        </section>




<section className="location-section" id="location">
  <div className="section-heading">
    <span>MY LOCATION</span>
    <h2>Where I'm From</h2>
    <p>Connect with me from Ekgaon, Nirmal District, Telangana.</p>
  </div>

  <div className="location-grid">

    <div className="location-info">
      <div className="location-icon">📍</div>

      <h3>ROUTHU SOUMITH</h3>

      <p className="location-village">
        Ekgaon
      </p>

      <p>
        Nirmal District, Telangana, India
      </p>

      <a
        href="https://www.google.com/maps/search/?api=1&query=Ekgaon%2C%20Nirmal%20District%2C%20Telangana%2C%20India"
        target="_blank"
        rel="noopener noreferrer"
        className="map-button"
      >
        Open in Google Maps ↗
      </a>
    </div>

    <div className="map-container">
      <MapContainer
        center={[19.1, 78.3]}
        zoom={10}
        scrollWheelZoom={false}
        className="portfolio-map"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={[19.1, 78.3]}>
          <Popup>
            <strong>ROUTHU SOUMITH</strong>
            <br />
            Ekgaon, Nirmal District
            <br />
            Telangana, India
          </Popup>
        </Marker>
      </MapContainer>
    </div>

  </div>
</section>


{/* =========================
    CONTACT SECTION
========================= */}

<section className="contact-section" id="contact">
  <div className="section-heading">
    <span>LET'S CONNECT</span>
    <h2>Let's Create Something Great</h2>
    <p>
      I'm open to video editing projects, creative collaborations,
      and internship opportunities.
    </p>
  </div>

  <div className="contact-grid">

    {/* Contact Card */}
    <div className="contact-card">
      <div className="contact-card-icon">✉️</div>

      <h3>Get In Touch</h3>

      <p>
        Have a project or collaboration in mind?
        Feel free to reach out.
      </p>

      <a
        href="mailto:YOUR_EMAIL@gmail.com"
        className="contact-button"
      >
        Send Me an Email ↗
      </a>
    </div>

    {/* Social Card */}
    <div className="contact-card">
      <div className="contact-card-icon">🌐</div>

      <h3>Social & Portfolio</h3>

      <div className="social-links">

        <a
          href="https://www.instagram.com/routhu_soumith/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Instagram ↗
        </a>

        <a
          href="https://github.com/routhusoumith"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub ↗
        </a>

        <a
          href="https://soumith-portfolio-live.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Portfolio ↗
        </a>

      </div>
    </div>

    {/* Resume Card */}
    <div className="contact-card resume-card">
      <div className="contact-card-icon">📄</div>

      <h3>My Resume</h3>

      <p>
        View or download my resume and learn more
        about my skills and experience.
      </p>

      <a
        href="/resume.pdf"
        target="_blank"
        rel="noopener noreferrer"
        className="contact-button"
      >
        View Resume ↗
      </a>
    </div>

  </div>

  {/* Location */}
  <div className="contact-location">
    <span>📍</span>
    <div>
      <strong>ROUTHU SOUMITH</strong>
      <p>Ekgaon, Nirmal District, Telangana, India</p>
    </div>
  </div>
</section>






        <section id="contact" className="contact-section">
          <span className="eyebrow">LET'S CREATE</span>

          <h2>
            Have an idea?
            <br />
            <span>Let's turn it into motion.</span>
          </h2>

          <a
            className="primary-button large"
            href="mailto:routhusoumith@gmail.com"
          >
            Start a Project →
          </a>

          <div className="social-links">
            <a
              href="https://www.instagram.com/routhu_soumith/"
              target="_blank"
              rel="noreferrer"
            >
              Instagram
            </a>

            <a
              href="https://soumith-portfolio-live.vercel.app"
              target="_blank"
              rel="noreferrer"
            >
              Portfolio
            </a>
          </div>
        </section>
      </main>

      <footer>
        <span>© {new Date().getFullYear()} Routhu Soumith</span>
        <span>Built for visual storytelling.</span>
      </footer>
    </div>
  );
}

function AdminDashboard({
  projects,
  title,
  setTitle,
  uploadCategory,
  setUploadCategory,
  description,
  setDescription,
  videoFile,
  setVideoFile,
  thumbnailFile,
  setThumbnailFile,
  uploading,
  handleUpload,
  handleDelete,
  handleLogout,
  message,
  error,
}) {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <span className="eyebrow">CREATOR CONTROL CENTER</span>
          <h1>Portfolio Dashboard</h1>
          <p>Upload your latest work and publish it instantly.</p>
        </div>

        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <div className="dashboard-grid">
        <form className="upload-card glass-card" onSubmit={handleUpload}>
          <div className="card-heading">
            <span className="card-icon">＋</span>

            <div>
              <h2>Upload New Work</h2>
              <p>Add a new video to your portfolio.</p>
            </div>
          </div>

          <label>Project title</label>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Example: Cinematic Travel Edit"
          />

          <label>Category</label>

          <select
            value={uploadCategory}
            onChange={(e) => setUploadCategory(e.target.value)}
          >
            {CATEGORIES.filter((item) => item !== "All").map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <label>Description</label>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the project..."
            rows="4"
          />

          <label>Video</label>

          <input
            id="videoInput"
            type="file"
            accept="video/*"
            onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
          />

          <label>Thumbnail</label>

          <input
            id="thumbnailInput"
            type="file"
            accept="image/*"
            onChange={(e) =>
              setThumbnailFile(e.target.files?.[0] || null)
            }
          />

          <button
            className="primary-button upload-button"
            type="submit"
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Publish Project →"}
          </button>
        </form>

        <div className="projects-admin">
          <div className="card-heading">
            <div>
              <span className="eyebrow">LIBRARY</span>
              <h2>Your Projects</h2>
            </div>

            <span className="project-count">{projects.length}</span>
          </div>

          {projects.length === 0 ? (
            <div className="empty-admin">
              Your uploaded projects will appear here.
            </div>
          ) : (
            <div className="admin-project-list">
              {projects.map((project) => (
                <div className="admin-project" key={project.id}>
                  <div className="admin-thumb">
                    {project.thumbnail_url ? (
                      <img src={project.thumbnail_url} alt="" />
                    ) : (
                      <span>▶</span>
                    )}
                  </div>

                  <div className="admin-project-info">
                    <span>{project.category}</span>
                    <h3>{project.title}</h3>
                  </div>

                  <button
                    className="delete-button"
                    onClick={() => handleDelete(project)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}