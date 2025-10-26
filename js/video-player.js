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
        
        // Simple preloading for projector display
        this.preloadedVideo = null;
        this.isVideoPreloaded = false;
        
        this.init();
    }

    // Initialize video player
    init() {
        this.config = window.theaterWallConfig;
        this.setupEventListeners();
        this.loadVideoSources();
        this.createVideoMask();
        
        // Preload the default video for instant playback
        setTimeout(() => {
            this.preloadDefaultVideo();
        }, 1000);
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
                    case 'm':
                        event.preventDefault();
                        this.toggleVideoMask();
                        break;
                }
            }
        });

        // Listen for configuration changes
        window.addEventListener('config-changed', () => {
            this.loadVideoSources();
        });
    }

    // Create CSS mask for video panels
    createVideoMask() {
        // Remove existing mask if any
        const existingMask = this.overlay?.querySelector('.video-mask');
        if (existingMask) {
            existingMask.remove();
        }
        
        // Get actual panel positions from the DOM
        const leftPanel = document.getElementById('panel-left');
        const centerPanel = document.getElementById('panel-center');
        const rightPanel = document.getElementById('panel-right');
        
        if (!leftPanel || !centerPanel || !rightPanel) {
            console.warn('Panels not found, cannot create mask');
            return;
        }
        
        // Get actual panel positions and dimensions
        const leftPanelRect = leftPanel.getBoundingClientRect();
        const centerPanelRect = centerPanel.getBoundingClientRect();
        const rightPanelRect = rightPanel.getBoundingClientRect();
        
        // Convert to viewport percentage
        const leftPanelStart = 5;
        const leftPanelWidth = 25;
        const centerPanelStart = 38.5;
        const centerPanelWidth = 23.5;
        const rightPanelStart = 71;
        const rightPanelWidth = 23;
        // const leftPanelStart = (leftPanelRect.left / window.innerWidth) * 100;
        // const leftPanelWidth = (leftPanelRect.width / window.innerWidth) * 100;
        // const centerPanelStart = (centerPanelRect.left / window.innerWidth) * 100;
        // const centerPanelWidth = (centerPanelRect.width / window.innerWidth) * 100;
        // const rightPanelStart = (rightPanelRect.left / window.innerWidth) * 100;
        // const rightPanelWidth = (rightPanelRect.width / window.innerWidth) * 100;
        
        console.log('Video mask calculations from DOM:', {
            leftPanelStart,
            leftPanelWidth,
            centerPanelStart,
            centerPanelWidth,
            rightPanelStart,
            rightPanelWidth,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight
        });
        
        // Ensure main video is visible
        if (this.player) {
            this.player.style.display = 'block';
        }
        
        // Create 3 separate clip-paths using CSS mask approach
        // Since CSS polygon connects all points, we need to use a different strategy
        
        // Apply individual clip-path to each panel area using CSS mask
        if (this.player) {
            // Use CSS mask with multiple gradients for better control
            const maskImage = `
                linear-gradient(to right,
                    transparent 0%,
                    transparent ${leftPanelStart}%,
                    white ${leftPanelStart}%,
                    white ${leftPanelStart + leftPanelWidth}%,
                    transparent ${leftPanelStart + leftPanelWidth}%,
                    transparent ${centerPanelStart}%,
                    white ${centerPanelStart}%,
                    white ${centerPanelStart + centerPanelWidth}%,
                    transparent ${centerPanelStart + centerPanelWidth}%,
                    transparent ${rightPanelStart}%,
                    white ${rightPanelStart}%,
                    white ${rightPanelStart + rightPanelWidth}%,
                    transparent ${rightPanelStart + rightPanelWidth}%,
                    transparent 100%
                )
            `;
            
            this.player.style.mask = maskImage;
            this.player.style.webkitMask = maskImage;
            this.player.style.maskMode = 'alpha';
            console.log('Applied CSS mask to video:', maskImage);
        }
        
        // Create visual indicators
        const maskContainer = document.createElement('div');
        maskContainer.className = 'video-mask';
        maskContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 5;
            pointer-events: none;
        `;
        
        // Add visual borders around panel areas
        // const panels = [
        //     { start: leftPanelStart, width: leftPanelWidth },
        //     { start: centerPanelStart, width: centerPanelWidth },
        //     { start: rightPanelStart, width: rightPanelWidth }
        // ];
        
        // panels.forEach((panel, index) => {
        //     const border = document.createElement('div');
        //     border.style.cssText = `
        //         position: absolute;
        //         left: ${panel.start}vw;
        //         top: 0;
        //         width: ${panel.width}vw;
        //         height: 100vh;
        //         border: 2px solid rgba(255, 255, 255, 0.3);
        //         box-sizing: border-box;
        //         pointer-events: none;
        //         z-index: 6;
        //     `;
        //     maskContainer.appendChild(border);
        // });
        
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

    // Preload the default video for instant playback
    preloadDefaultVideo() {
        if (this.videoSources.length === 0) {
            console.log('🎬 No videos to preload');
            return;
        }

        const videoSource = this.videoSources[0]; // Use first video (ric-flair.mp4)
        console.log(`🎬 Preloading video: ${videoSource}`);

        // Create hidden video element for preloading
        const preloadVideo = document.createElement('video');
        preloadVideo.preload = 'auto';
        preloadVideo.muted = true; // Muted to avoid autoplay issues
        preloadVideo.src = videoSource;
        preloadVideo.style.display = 'none';
        
        // Add to DOM to start loading
        document.body.appendChild(preloadVideo);

        // Listen for preload completion
        preloadVideo.addEventListener('canplaythrough', () => {
            console.log(`✅ Video preloaded successfully: ${videoSource}`);
            this.preloadedVideo = preloadVideo;
            this.isVideoPreloaded = true;
            
            // Remove from DOM but keep reference
            document.body.removeChild(preloadVideo);
        });

        preloadVideo.addEventListener('error', (e) => {
            console.error(`❌ Failed to preload video: ${videoSource}`, e);
            this.isVideoPreloaded = false;
        });

        // Start loading
        preloadVideo.load();
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
        
        // Check if we have this video preloaded
        if (this.isVideoPreloaded && this.preloadedVideo.src.includes(source)) {
            console.log(`🎬 Using preloaded video: ${source}`);
            
            // Copy preloaded video to main player
            this.player.src = source;
            this.player.load();
            
            // Video should play instantly since it's preloaded
            const videoConfig = this.config.getVideoConfig();
            this.player.loop = videoConfig.loop;
            this.player.volume = videoConfig.volume;
            
            this.showVideoOverlay();
            
            // Try to play immediately
            this.player.play().catch(error => {
                console.error('Failed to play preloaded video:', error);
                this.onVideoError(error);
            });
            
        } else {
            console.log(`🎬 Loading video on-demand: ${source}`);
            
            // Load normally if not preloaded
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
    }

    // Show video overlay
    showVideoOverlay() {
        if (this.overlay) {
            console.log('Showing video overlay, removing hidden class');
            this.overlay.classList.remove('hidden');
            this.overlay.classList.add('active');
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

    // Toggle video mask on/off for testing
    toggleVideoMask() {
        const mask = this.overlay?.querySelector('.video-mask');
        if (mask) {
            if (mask.style.display === 'none') {
                mask.style.display = 'block';
                console.log('Video mask enabled');
            } else {
                mask.style.display = 'none';
                console.log('Video mask disabled - full video visible');
            }
        } else {
            console.log('No video mask found');
        }
        
        // Debug video element state
        this.debugVideoElement();
    }

    // Debug video element properties
    debugVideoElement() {
        if (!this.player) {
            console.log('No video player element found');
            return;
        }
        
        console.log('Video element debug:', {
            element: this.player,
            src: this.player.src,
            currentSrc: this.player.currentSrc,
            readyState: this.player.readyState,
            networkState: this.player.networkState,
            videoWidth: this.player.videoWidth,
            videoHeight: this.player.videoHeight,
            paused: this.player.paused,
            ended: this.player.ended,
            currentTime: this.player.currentTime,
            duration: this.player.duration,
            style: {
                display: this.player.style.display,
                visibility: this.player.style.visibility,
                opacity: this.player.style.opacity,
                width: this.player.style.width,
                height: this.player.style.height,
                zIndex: this.player.style.zIndex
            },
            computedStyle: window.getComputedStyle(this.player),
            parentElement: this.player.parentElement,
            isVisible: this.player.offsetWidth > 0 && this.player.offsetHeight > 0
        });
    }

    // Get current video state
    getState() {
        return {
            isPlaying: this.isPlaying,
            currentVideo: this.currentVideo,
            currentTime: this.player?.currentTime || 0,
            duration: this.player?.duration || 0,
            volume: this.player?.volume || 0,
            isVideoPreloaded: this.isVideoPreloaded
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