// Video Player System with Panel Masking

class VideoPlayer {
    constructor() {
        this.overlay = document.getElementById('video-overlay');
        this.player = document.getElementById('video-player');
        this.controls = document.getElementById('video-controls');
        this.trigger = document.getElementById('video-trigger');
        this.closeBtn = document.getElementById('video-close');
        this.playPauseBtn = document.getElementById('video-play-pause');
        
        this.config = null;
        this.isPlaying = false;
        this.currentVideo = null;
        this.videoSources = [];
        
        this.init();
    }

    // Initialize video player
    init() {
        this.config = window.theaterWallConfig;
        this.setupEventListeners();
        this.loadVideoSources();
        this.createVideoMask();
    }

    // Setup event listeners
    setupEventListeners() {
        // Video trigger button
        if (this.trigger) {
            this.trigger.addEventListener('click', () => {
                this.showVideoSelector();
            });
        }

        // Close button
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => {
                this.hideVideo();
            });
        }

        // Play/Pause button
        if (this.playPauseBtn) {
            this.playPauseBtn.addEventListener('click', () => {
                this.togglePlayPause();
            });
        }

        // Video player events
        if (this.player) {
            this.player.addEventListener('loadstart', () => {
                this.showLoading();
            });

            this.player.addEventListener('canplay', () => {
                this.hideLoading();
            });

            this.player.addEventListener('play', () => {
                this.isPlaying = true;
                this.updatePlayPauseButton();
            });

            this.player.addEventListener('pause', () => {
                this.isPlaying = false;
                this.updatePlayPauseButton();
            });

            this.player.addEventListener('ended', () => {
                this.onVideoEnded();
            });

            this.player.addEventListener('error', (e) => {
                this.onVideoError(e);
            });

            this.player.addEventListener('timeupdate', () => {
                this.updateProgress();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (this.overlay && !this.overlay.classList.contains('hidden')) {
                switch (event.key) {
                    case 'Escape':
                        this.hideVideo();
                        break;
                    case ' ':
                    case 'k':
                        event.preventDefault();
                        this.togglePlayPause();
                        break;
                    case 'ArrowRight':
                        this.skipForward(10);
                        break;
                    case 'ArrowLeft':
                        this.skipBackward(10);
                        break;
                    case 'ArrowUp':
                        event.preventDefault();
                        this.adjustVolume(0.1);
                        break;
                    case 'ArrowDown':
                        event.preventDefault();
                        this.adjustVolume(-0.1);
                        break;
                    case 'f':
                        this.toggleFullscreen();
                        break;
                }
            }
        });

        // Listen for configuration changes
        window.addEventListener('config-changed', () => {
            this.loadVideoSources();
        });
    }

    // Create SVG mask for video panels
    createVideoMask() {
        const maskContainer = document.createElement('div');
        maskContainer.className = 'video-mask';
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        
        const mask = document.createElementNS('http://www.w3.org/2000/svg', 'mask');
        mask.setAttribute('id', 'panel-mask');
        
        // Create mask rectangles for 3 panels
        const panelWidth = this.config.get('panelWidth');
        const panelGap = this.config.get('panelGap');
        const leftPanelStart = 5;
        const leftPanelEnd = leftPanelStart + panelWidth;
        const centerPanelStart = leftPanelEnd + panelGap;
        const centerPanelEnd = centerPanelStart + panelWidth;
        const rightPanelStart = centerPanelEnd + panelGap;
        const rightPanelEnd = rightPanelStart + panelWidth;
        
        // Left panel
        const leftRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        leftRect.setAttribute('x', leftPanelStart);
        leftRect.setAttribute('y', '10');
        leftRect.setAttribute('width', panelWidth);
        leftRect.setAttribute('height', '80');
        leftRect.setAttribute('fill', 'white');
        
        // Center panel
        const centerRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        centerRect.setAttribute('x', centerPanelStart);
        centerRect.setAttribute('y', '10');
        centerRect.setAttribute('width', panelWidth);
        centerRect.setAttribute('height', '80');
        centerRect.setAttribute('fill', 'white');
        
        // Right panel
        const rightRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rightRect.setAttribute('x', rightPanelStart);
        rightRect.setAttribute('y', '10');
        rightRect.setAttribute('width', panelWidth);
        rightRect.setAttribute('height', '80');
        rightRect.setAttribute('fill', 'white');
        
        mask.appendChild(leftRect);
        mask.appendChild(centerRect);
        mask.appendChild(rightRect);
        
        // Create masked rectangle
        const maskedRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        maskedRect.setAttribute('x', '0');
        maskedRect.setAttribute('y', '0');
        maskedRect.setAttribute('width', '100');
        maskedRect.setAttribute('height', '100');
        maskedRect.setAttribute('fill', 'white');
        maskedRect.setAttribute('mask', 'url(#panel-mask)');
        
        svg.appendChild(mask);
        svg.appendChild(maskedRect);
        maskContainer.appendChild(svg);
        
        // Insert mask into overlay
        if (this.overlay) {
            this.overlay.insertBefore(maskContainer, this.overlay.firstChild);
        }
    }

    // Load video sources from configuration
    loadVideoSources() {
        const videoConfig = this.config.getVideoConfig();
        this.videoSources = videoConfig.defaultSources || [];
    }

    // Show video selector
    showVideoSelector() {
        if (this.videoSources.length === 0) {
            this.config.showNotification('No video sources configured', 'warning');
            return;
        }

        if (this.videoSources.length === 1) {
            this.playVideo(this.videoSources[0]);
        } else {
            this.showVideoMenu();
        }
    }

    // Show video selection menu
    showVideoMenu() {
        const menu = document.createElement('div');
        menu.className = 'video-menu';
        menu.innerHTML = `
            <h3>Select Video</h3>
            <div class="video-list">
                ${this.videoSources.map((source, index) => `
                    <div class="video-item" data-source="${source}">
                        <span class="video-title">Video ${index + 1}</span>
                        <span class="video-path">${source}</span>
                    </div>
                `).join('')}
            </div>
            <button class="video-menu-close">Cancel</button>
        `;

        // Add styles
        Object.assign(menu.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(20, 20, 30, 0.95)',
            border: '2px solid #333',
            borderRadius: '12px',
            padding: '30px',
            zIndex: '4000',
            backdropFilter: 'blur(20px)',
            minWidth: '400px',
            maxHeight: '80vh',
            overflowY: 'auto'
        });

        document.body.appendChild(menu);

        // Add event listeners
        menu.querySelectorAll('.video-item').forEach(item => {
            item.addEventListener('click', () => {
                const source = item.dataset.source;
                this.playVideo(source);
                document.body.removeChild(menu);
            });
        });

        menu.querySelector('.video-menu-close').addEventListener('click', () => {
            document.body.removeChild(menu);
        });

        // Close on outside click
        menu.addEventListener('click', (event) => {
            if (event.target === menu) {
                document.body.removeChild(menu);
            }
        });
    }

    // Play video
    playVideo(source) {
        if (!this.player) return;

        this.currentVideo = source;
        this.player.src = source;
        this.player.load();
        
        const videoConfig = this.config.getVideoConfig();
        this.player.loop = videoConfig.loop;
        this.player.volume = videoConfig.volume;
        
        this.showVideoOverlay();
        
        this.player.play().catch(error => {
            console.error('Failed to play video:', error);
            this.onVideoError(error);
        });
    }

    // Show video overlay
    showVideoOverlay() {
        if (this.overlay) {
            this.overlay.classList.remove('hidden');
            setTimeout(() => {
                this.overlay.classList.add('active');
            }, 10);
        }
    }

    // Hide video overlay
    hideVideo() {
        if (this.overlay) {
            this.overlay.classList.remove('active');
            setTimeout(() => {
                this.overlay.classList.add('hidden');
            }, 500);
        }
        
        if (this.player) {
            this.player.pause();
            this.player.currentTime = 0;
        }
        
        this.isPlaying = false;
        this.currentVideo = null;
    }

    // Toggle play/pause
    togglePlayPause() {
        if (!this.player) return;

        if (this.isPlaying) {
            this.player.pause();
        } else {
            this.player.play();
        }
    }

    // Update play/pause button
    updatePlayPauseButton() {
        if (this.playPauseBtn) {
            this.playPauseBtn.textContent = this.isPlaying ? '⏸️' : '▶️';
        }
    }

    // Skip forward
    skipForward(seconds) {
        if (this.player) {
            this.player.currentTime = Math.min(this.player.duration, this.player.currentTime + seconds);
        }
    }

    // Skip backward
    skipBackward(seconds) {
        if (this.player) {
            this.player.currentTime = Math.max(0, this.player.currentTime - seconds);
        }
    }

    // Adjust volume
    adjustVolume(delta) {
        if (this.player) {
            this.player.volume = Math.max(0, Math.min(1, this.player.volume + delta));
            this.config.set('video.volume', this.player.volume);
        }
    }

    // Toggle fullscreen
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    // Update progress bar
    updateProgress() {
        if (!this.player) return;

        const progressFill = document.querySelector('.video-progress-fill');
        const currentTimeEl = document.querySelector('.video-time .current');
        const durationEl = document.querySelector('.video-time .duration');

        if (progressFill) {
            const progress = (this.player.currentTime / this.player.duration) * 100;
            progressFill.style.width = `${progress}%`;
        }

        if (currentTimeEl) {
            currentTimeEl.textContent = this.formatTime(this.player.currentTime);
        }

        if (durationEl) {
            durationEl.textContent = this.formatTime(this.player.duration);
        }
    }

    // Format time
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    // Show loading state
    showLoading() {
        const loading = document.createElement('div');
        loading.className = 'video-loading';
        loading.innerHTML = `
            <div class="video-loading-spinner"></div>
            <div>Loading video...</div>
        `;
        
        if (this.overlay) {
            this.overlay.appendChild(loading);
        }
    }

    // Hide loading state
    hideLoading() {
        const loading = this.overlay?.querySelector('.video-loading');
        if (loading) {
            loading.remove();
        }
    }

    // Handle video ended
    onVideoEnded() {
        const videoConfig = this.config.getVideoConfig();
        
        if (videoConfig.loop) {
            // Video will loop automatically
            return;
        }
        
        // Show ended state or hide overlay
        setTimeout(() => {
            this.hideVideo();
        }, 2000);
    }

    // Handle video error
    onVideoError(error) {
        console.error('Video error:', error);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'video-error';
        errorDiv.innerHTML = `
            <h3>Video Error</h3>
            <p>Failed to load or play the video.</p>
            <p>Please check the video source and try again.</p>
        `;
        
        if (this.overlay) {
            this.overlay.appendChild(errorDiv);
        }
        
        this.hideLoading();
    }

    // Add video source
    addVideoSource(source) {
        this.videoSources.push(source);
        this.config.set('video.defaultSources', this.videoSources);
    }

    // Remove video source
    removeVideoSource(source) {
        const index = this.videoSources.indexOf(source);
        if (index > -1) {
            this.videoSources.splice(index, 1);
            this.config.set('video.defaultSources', this.videoSources);
        }
    }

    // Get current video state
    getState() {
        return {
            isPlaying: this.isPlaying,
            currentVideo: this.currentVideo,
            currentTime: this.player?.currentTime || 0,
            duration: this.player?.duration || 0,
            volume: this.player?.volume || 0
        };
    }

    // Set video state
    setState(state) {
        if (state.currentVideo && this.player) {
            this.playVideo(state.currentVideo);
            if (state.currentTime) {
                this.player.currentTime = state.currentTime;
            }
            if (state.volume !== undefined) {
                this.player.volume = state.volume;
            }
            if (state.isPlaying) {
                this.player.play();
            }
        }
    }
}

// Initialize video player
window.videoPlayer = new VideoPlayer();