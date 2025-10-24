// Celebration Trigger Polling System

class CelebrationTrigger {
    constructor() {
        this.pollingInterval = null;
        this.pollingFrequency = 1000; // 1 second
        this.lastTriggerTime = 0;
        this.cooldownPeriod = 5000; // 5 seconds between triggers
        this.isActive = false;
        
        this.init();
    }

    // Initialize the celebration trigger system
    init() {
        console.log('🎬 Initializing celebration trigger system');
        this.startPolling();
    }

    // Start polling for celebration triggers
    startPolling() {
        if (this.isActive) {
            console.log('🎬 Celebration trigger polling already active');
            return;
        }

        this.isActive = true;
        console.log(`🎬 Starting celebration trigger polling (every ${this.pollingFrequency}ms)`);
        
        this.pollingInterval = setInterval(() => {
            this.checkForTrigger();
        }, this.pollingFrequency);
    }

    // Stop polling for celebration triggers
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        this.isActive = false;
        console.log('🎬 Stopped celebration trigger polling');
    }

    // Check for celebration trigger
    async checkForTrigger() {
        try {
            const response = await fetch('/celebration-trigger.json');
            const data = await response.json();
            
            // Check if there's a trigger
            if (data.type === 'celebration_trigger') {
                const now = Date.now();
                
                // Check cooldown to prevent duplicate triggers
                if (now - this.lastTriggerTime < this.cooldownPeriod) {
                    console.log(`🎬 Celebration trigger ignored due to cooldown (${now - this.lastTriggerTime}ms < ${this.cooldownPeriod}ms)`);
                    return;
                }
                
                console.log('🎬 Celebration trigger detected!', data);
                this.lastTriggerTime = now;
                
                // Trigger the celebration
                this.triggerCelebration(data);
            }
        } catch (error) {
            // Silently ignore errors (file not found, etc.)
            // This is normal behavior when no trigger is present
        }
    }

    // Trigger the celebration video
    async triggerCelebration(data) {
        const { videoFile, autoHide = true, duration = 10000 } = data;
        
        console.log(`🎬 Triggering celebration video: ${videoFile}`);
        console.log(`🎬 Options: autoHide=${autoHide}, duration=${duration}`);
        
        try {
            // Get the video player instance
            const videoPlayer = window.videoPlayer;
            if (!videoPlayer) {
                console.error('🎬 Video player not available');
                return;
            }
            
            // Play the video with celebration options
            await videoPlayer.playVideo(videoFile, {
                loop: false,
                volume: 0.8
            });
            
            // Set up auto-hide if enabled
            if (autoHide) {
                setTimeout(() => {
                    console.log('🎬 Auto-hiding celebration video');
                    videoPlayer.hideVideo();
                }, duration);
            }
            
            // Show notification if available
            if (window.theaterWallConfig) {
                window.theaterWallConfig.showNotification('🎉 GOAL CELEBRATION!', 'success', 3000);
            }
            
            console.log('✅ Celebration video triggered successfully');
            
        } catch (error) {
            console.error('🎬 Failed to trigger celebration video:', error);
        }
    }

    // Manual trigger method for testing
    manualTrigger(videoFile = 'assets/videos/ric-flair-celebration.mp4') {
        const triggerData = {
            type: 'celebration_trigger',
            videoFile,
            autoHide: true,
            duration: 10000,
            timestamp: new Date().toISOString()
        };
        
        console.log('🎬 Manual celebration trigger:', triggerData);
        this.triggerCelebration(triggerData);
    }

    // Get system status
    getStatus() {
        return {
            isActive: this.isActive,
            pollingFrequency: this.pollingFrequency,
            lastTriggerTime: this.lastTriggerTime,
            cooldownPeriod: this.cooldownPeriod,
            timeSinceLastTrigger: this.lastTriggerTime ? Date.now() - this.lastTriggerTime : 0
        };
    }

    // Cleanup
    destroy() {
        this.stopPolling();
        console.log('🎬 Celebration trigger system destroyed');
    }
}

// Initialize celebration trigger system
window.celebrationTrigger = new CelebrationTrigger();

// Add global methods for testing
window.triggerCelebration = (videoFile) => {
    window.celebrationTrigger.manualTrigger(videoFile);
};

window.getCelebrationStatus = () => {
    console.log('🎬 Celebration trigger status:', window.celebrationTrigger.getStatus());
    return window.celebrationTrigger.getStatus();
};

console.log('🎬 Celebration trigger system loaded');
console.log('🎬 Global commands available:');
console.log('  triggerCelebration(videoFile) - Manually trigger celebration');
console.log('  getCelebrationStatus() - Get system status');