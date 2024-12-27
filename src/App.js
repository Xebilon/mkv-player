import React, { Component } from "react";
import Dropzone from "react-dropzone";
import Loading from "./components/Loading";
import "./App.css";

class App extends Component {
  state = {
    loading: false,
    video: null, // Blob URL for the video
    urlInput: "", // Input box state for video URL
    playbackProgress: 0, // Track playback progress
    downloading: false, // Track if downloading is ongoing
  };

  videoNode = null; // Reference to the video element
  downloadedChunks = []; // Array to store video chunks
  chunkSize = 50 * 1024 * 1024; // 50 MB per chunk
  totalSize = 0; // Total file size
  downloadedBytes = 0; // Bytes downloaded so far

  // Handle URL input change
  handleUrlChange = (event) => {
    this.setState({ urlInput: event.target.value });
  };

  // Play video from URL with segmented downloading
  handleUrlPlay = async () => {
    if (this.state.urlInput) {
      try {
        this.setState({ loading: true, downloading: true });

        // Fetch the file size
        const headResponse = await fetch(this.state.urlInput, {
          method: "HEAD",
        });
        if (!headResponse.ok) {
          throw new Error("Failed to fetch file info.");
        }
        this.totalSize = parseInt(headResponse.headers.get("content-length"), 10);

        // Start downloading the first chunk
        await this.downloadChunk(0, this.chunkSize);

        // Create a blob URL for the video and set it to the state
        const blob = new Blob(this.downloadedChunks, { type: "video/webm" });
        const videoUrl = URL.createObjectURL(blob);

        this.setState({ video: videoUrl, loading: false });
        this.startDownloadingRemainingChunks(); // Download remaining chunks in the background
      } catch (error) {
        console.error("Error downloading video:", error);
        this.setState({ loading: false, downloading: false });
        alert("Failed to load video. Please check the URL and try again.");
      }
    }
  };

  // Download a specific chunk of the video
  downloadChunk = async (start, end) => {
    const response = await fetch(this.state.urlInput, {
      headers: { Range: `bytes=${start}-${end - 1}` },
    });
    if (!response.ok) {
      throw new Error("Failed to download chunk.");
    }
    const chunk = await response.blob();
    this.downloadedChunks.push(chunk);
    this.downloadedBytes += chunk.size;
    console.log(`Downloaded chunk: ${start}-${end - 1}`);
  };

  // Start downloading remaining chunks
  startDownloadingRemainingChunks = async () => {
    while (this.downloadedBytes < this.totalSize) {
      const start = this.downloadedBytes;
      const end = Math.min(this.downloadedBytes + this.chunkSize, this.totalSize);
      try {
        await this.downloadChunk(start, end);

        // Update the blob URL as new chunks are downloaded
        const blob = new Blob(this.downloadedChunks, { type: "video/webm" });
        const videoUrl = URL.createObjectURL(blob);

        // Update the video source dynamically
        if (this.videoNode) {
          this.videoNode.src = videoUrl;
        }
      } catch (error) {
        console.error("Error downloading additional chunk:", error);
        break;
      }
    }

    this.setState({ downloading: false });
    console.log("All chunks downloaded.");
  };

  componentDidMount() {
    // Add event listeners for video playback
    if (this.videoNode) {
      this.videoNode.addEventListener("timeupdate", this.handlePlaybackProgress);
    }
  }

  componentWillUnmount() {
    if (this.videoNode) {
      this.videoNode.removeEventListener("timeupdate", this.handlePlaybackProgress);
    }
  }

  // Monitor playback progress
  handlePlaybackProgress = () => {
    if (this.videoNode) {
      const progress =
        (this.videoNode.currentTime / this.videoNode.duration) * 100 || 0;
      this.setState({ playbackProgress: progress });
      console.log(`Playback progress: ${progress.toFixed(2)}%`);
    }
  };

  render() {
    const { video, loading, playbackProgress, downloading } = this.state;

    if (video) {
      return (
        <div className="App">
          <h1>Web-based MKV Player with Segmented Downloading</h1>
          <div className="player-container">
            <video
              ref={(node) => (this.videoNode = node)}
              className="video-js"
              controls
              autoPlay
            />
            <div>
              <p>Playback Progress: {playbackProgress.toFixed(2)}%</p>
              {downloading && <p>Downloading remaining chunks...</p>}
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="App">
          {loading && <Loading />}
          <h1>Web-based MKV Player</h1>
          <Dropzone>
            <p className="drop">
              Drop a file anywhere on this page or click here to select a file.
            </p>
          </Dropzone>
          <div className="url-input">
            <input
              type="text"
              placeholder="Enter URL to .mkv file"
              value={this.state.urlInput}
              onChange={this.handleUrlChange}
            />
            <button onClick={this.handleUrlPlay}>Play</button>
          </div>
          <p>
            The video will be downloaded in 50 MB chunks and played as the chunks
            are ready.
          </p>
        </div>
      );
    }
  }
}

export default App;
