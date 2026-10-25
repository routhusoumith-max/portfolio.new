import { useEffect, useState } from "react";
import { supabase } from "./supabase";

function AdminDashboard({ user }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Reel");
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState(null);

  const [projects, setProjects] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setProjects(data || []);
  }

  async function uploadVideo(e) {
    e.preventDefault();

    if (!videoFile) {
      setMessage("Please select a video.");
      return;
    }

    if (!title.trim()) {
      setMessage("Please enter a title.");
      return;
    }

    try {
      setUploading(true);
      setMessage("");

      const fileName =
        Date.now() + "-" + videoFile.name.replace(/\s+/g, "-");

      const filePath = `portfolio/${fileName}`;

      // Upload video
      const { error: uploadError } = await supabase.storage
        .from("portfolio-videos")
        .upload(filePath, videoFile);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: publicData } = supabase.storage
        .from("portfolio-videos")
        .getPublicUrl(filePath);

      const videoUrl = publicData.publicUrl;

      // Save project information
      const { error: databaseError } = await supabase
        .from("projects")
        .insert({
          title: title.trim(),
          category,
          description: description.trim(),
          video_url: videoUrl,
          published: true,
        });

      if (databaseError) {
        throw databaseError;
      }

      setTitle("");
      setCategory("Reel");
      setDescription("");
      setVideoFile(null);

      document.getElementById("videoFile").value = "";

      setMessage("Video uploaded successfully! 🎉");

      loadProjects();

    } catch (error) {
      console.error(error);
      setMessage("Upload failed: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function deleteProject(project) {
    const confirmed = window.confirm(
      `Delete "${project.title}"?`
    );

    if (!confirmed) return;

    try {
      // Extract file path from URL
      const url = new URL(project.video_url);

      const pathStart =
        "/storage/v1/object/public/portfolio-videos/";

      const filePath = decodeURIComponent(
        url.pathname.split(pathStart)[1]
      );

      if (filePath) {
        await supabase.storage
          .from("portfolio-videos")
          .remove([filePath]);
      }

      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", project.id);

      if (error) {
        throw error;
      }

      setMessage("Project deleted.");

      loadProjects();

    } catch (error) {
      console.error(error);
      setMessage("Delete failed: " + error.message);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="admin-dashboard">

      <div className="admin-header">

        <div>
          <p className="admin-label">
            SOUMITH PORTFOLIO
          </p>

          <h1>
            Admin Dashboard
          </h1>

          <p>
            Logged in as {user?.email}
          </p>
        </div>

        <button
          className="logout-button"
          onClick={logout}
        >
          Logout
        </button>

      </div>

      <div className="admin-content">

        <div className="upload-card">

          <h2>
            Upload New Video
          </h2>

          <form onSubmit={uploadVideo}>

            <label>
              Video
            </label>

            <input
              id="videoFile"
              type="file"
              accept="video/*"
              onChange={(e) =>
                setVideoFile(e.target.files[0])
              }
            />

            <label>
              Title
            </label>

            <input
              type="text"
              placeholder="Example: Cinematic Travel Edit"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
            />

            <label>
              Category
            </label>

            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value)
              }
            >
              <option>Reel</option>
              <option>Cinematic</option>
              <option>Short Film</option>
              <option>Motion Edit</option>
              <option>AI Edit</option>
              <option>Instagram Reel</option>
            </select>

            <label>
              Description
            </label>

            <textarea
              placeholder="Describe your project..."
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              rows="5"
            />

            <button
              className="upload-button"
              type="submit"
              disabled={uploading}
            >
              {uploading
                ? "Uploading..."
                : "Upload Video"}
            </button>

          </form>

          {message && (
            <div className="admin-message">
              {message}
            </div>
          )}

        </div>

        <div className="projects-admin">

          <h2>
            Your Projects
          </h2>

          {projects.length === 0 ? (
            <p>No projects uploaded yet.</p>
          ) : (
            projects.map((project) => (

              <div
                className="admin-project"
                key={project.id}
              >

                <div>
                  <h3>
                    {project.title}
                  </h3>

                  <p>
                    {project.category}
                  </p>
                </div>

                <button
                  className="delete-button"
                  onClick={() =>
                    deleteProject(project)
                  }
                >
                  Delete
                </button>

              </div>

            ))
          )}

        </div>

      </div>

    </div>
  );
}

export default AdminDashboard;