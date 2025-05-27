/**
 * Visualizer.js - GSAP-based audio visualization
 * Creates reactive visual feedback for audio playback and BPM
 */

import { gsap } from 'gsap';

export default class Visualizer {
  constructor(container) {
    this.container = container || document.body;
    this.elements = {};
    this.animations = {};
    this.isActive = false;
    
    // Default theme (Winamp-inspired)
    this.theme = {
      primary: '#00ff00',
      secondary: '#ffff00',
      background: '#000000',
      accent: '#ff00ff',
      text: '#ffffff'
    };
    
    this._createElements();
    this._setupStyles();
  }
  
  /**
   * Create visualization elements
   */
  _createElements() {
    // Main visualizer container
    const vizContainer = document.createElement('div');
    vizContainer.className = 'plecoxa-viz';
    vizContainer.innerHTML = `
      <div class="viz-display">
        <div class="bpm-display">
          <span class="bpm-value">---</span>
          <span class="bpm-label">BPM</span>
        </div>
        <div class="waveform-container">
          <canvas class="waveform" width="400" height="100"></canvas>
        </div>
        <div class="peak-meter">
          <div class="peak-bar"></div>
        </div>
      </div>
      <div class="viz-status">
        <span class="status-text">Ready</span>
      </div>
    `;
    
    this.container.appendChild(vizContainer);
    
    // Cache element references
    this.elements = {
      container: vizContainer,
      bpmValue: vizContainer.querySelector('.bpm-value'),
      bpmLabel: vizContainer.querySelector('.bpm-label'),
      waveform: vizContainer.querySelector('.waveform'),
      peakBar: vizContainer.querySelector('.peak-bar'),
      status: vizContainer.querySelector('.status-text')
    };
    
    // Get canvas context
    this.waveformCtx = this.elements.waveform.getContext('2d');
  }
  
  /**
   * Setup base styles
   */
  _setupStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .plecoxa-viz {
        font-family: 'Courier New', monospace;
        background: ${this.theme.background};
        color: ${this.theme.text};
        padding: 20px;
        border: 2px solid ${this.theme.primary};
        border-radius: 4px;
        display: inline-block;
        user-select: none;
      }
      
      .viz-display {
        display: flex;
        gap: 20px;
        align-items: center;
        margin-bottom: 10px;
      }
      
      .bpm-display {
        text-align: center;
        min-width: 100px;
      }
      
      .bpm-value {
        display: block;
        font-size: 48px;
        font-weight: bold;
        color: ${this.theme.primary};
        text-shadow: 0 0 10px ${this.theme.primary};
        line-height: 1;
      }
      
      .bpm-label {
        display: block;
        font-size: 14px;
        margin-top: 5px;
        color: ${this.theme.secondary};
      }
      
      .waveform-container {
        border: 1px solid ${this.theme.primary};
        padding: 2px;
        background: #111;
      }
      
      .peak-meter {
        width: 20px;
        height: 100px;
        background: #111;
        border: 1px solid ${this.theme.primary};
        position: relative;
        overflow: hidden;
      }
      
      .peak-bar {
        position: absolute;
        bottom: 0;
        width: 100%;
        background: linear-gradient(
          to top,
          ${this.theme.primary} 0%,
          ${this.theme.secondary} 60%,
          ${this.theme.accent} 100%
        );
        height: 0%;
        transition: height 0.05s ease-out;
      }
      
      .viz-status {
        font-size: 12px;
        color: ${this.theme.secondary};
        text-align: center;
      }
    `;
    
    document.head.appendChild(style);
    this._styleElement = style;
  }
  
  /**
   * Start visualization
   */
  start() {
    this.isActive = true;
    this.updateStatus('Playing');
    this._startWaveformAnimation();
  }
  
  /**
   * Stop visualization
   */
  stop() {
    this.isActive = false;
    this.updateStatus('Stopped');
    this._stopAnimations();
  }
  
  /**
   * Update BPM display
   */
  updateBPM(value) {
    const displayValue = Math.round(value);
    this.elements.bpmValue.textContent = displayValue || '---';
    
    // Animate color based on tempo range
    let color = this.theme.primary;
    if (displayValue < 90) color = '#00ffff'; // Slow
    else if (displayValue > 140) color = '#ff00ff'; // Fast
    
    gsap.to(this.elements.bpmValue, {
      color: color,
      duration: 0.3
    });
  }
  
  /**
   * Pulse effect on beat
   */
  pulse(beatData = {}) {
    const { strength = 1.0 } = beatData;
    
    // BPM pulse
    gsap.fromTo(this.elements.bpmValue, {
      scale: 1,
      textShadow: `0 0 10px ${this.theme.primary}`
    }, {
      scale: 1 + (0.2 * strength),
      textShadow: `0 0 ${20 + 20 * strength}px ${this.theme.primary}`,
      duration: 0.1,
      ease: "power2.out",
      yoyo: true,
      repeat: 1
    });
    
    // Container flash
    gsap.fromTo(this.elements.container, {
      borderColor: this.theme.primary
    }, {
      borderColor: this.theme.accent,
      duration: 0.1,
      yoyo: true,
      repeat: 1
    });
  }
  
  /**
   * Update peak meter
   */
  updatePeakMeter(level) {
    const percentage = Math.min(100, level * 100);
    this.elements.peakBar.style.height = `${percentage}%`;
    
    // Change color at high levels
    if (percentage > 80) {
      this.elements.peakBar.style.background = `linear-gradient(
        to top,
        ${this.theme.accent} 0%,
        #ff0000 100%
      )`;
    }
  }
  
  /**
   * Draw waveform
   */
  drawWaveform(audioData, currentTime = 0) {
    const canvas = this.elements.waveform;
    const ctx = this.waveformCtx;
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    if (!audioData || !audioData.length) return;
    
    // Draw waveform
    const step = Math.ceil(audioData.length / width);
    const amp = height / 2;
    
    ctx.strokeStyle = this.theme.primary;
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    for (let i = 0; i < width; i++) {
      const sample = audioData[i * step] || 0;
      const y = amp + sample * amp;
      
      if (i === 0) {
        ctx.moveTo(i, y);
      } else {
        ctx.lineTo(i, y);
      }
    }
    
    ctx.stroke();
    
    // Draw playhead
    if (currentTime > 0) {
      const playheadX = (currentTime * width) / audioData.length;
      ctx.strokeStyle = this.theme.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
    }
  }
  
  /**
   * Update status text
   */
  updateStatus(text) {
    this.elements.status.textContent = text;
  }
  
  /**
   * Start waveform animation
   */
  _startWaveformAnimation() {
    if (this.animations.waveform) return;
    
    const canvas = this.elements.waveform;
    const ctx = this.waveformCtx;
    const width = canvas.width;
    const height = canvas.height;
    
    let phase = 0;
    
    const animate = () => {
      if (!this.isActive) return;
      
      // Clear
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, width, height);
      
      // Draw animated sine wave
      ctx.strokeStyle = this.theme.primary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      for (let x = 0; x < width; x++) {
        const y = height/2 + Math.sin((x * 0.02) + phase) * 30;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
      
      phase += 0.1;
      this.animations.waveform = requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  /**
   * Stop all animations
   */
  _stopAnimations() {
    if (this.animations.waveform) {
      cancelAnimationFrame(this.animations.waveform);
      this.animations.waveform = null;
    }
    
    // Kill all GSAP animations
    gsap.killTweensOf([
      this.elements.bpmValue,
      this.elements.container
    ]);
  }
  
  /**
   * Set custom theme
   */
  setTheme(theme) {
    Object.assign(this.theme, theme);
    this._updateThemeStyles();
  }
  
  /**
   * Update theme styles
   */
  _updateThemeStyles() {
    // Re-create styles with new theme
    if (this._styleElement) {
      this._styleElement.remove();
    }
    this._setupStyles();
  }
  
  /**
   * Cleanup
   */
  dispose() {
    this._stopAnimations();
    
    if (this._styleElement) {
      this._styleElement.remove();
    }
    
    if (this.elements.container) {
      this.elements.container.remove();
    }
  }
}

// Preset themes
export const themes = {
  winamp: {
    primary: '#00ff00',
    secondary: '#ffff00',
    background: '#000000',
    accent: '#ff00ff',
    text: '#ffffff'
  },
  neon: {
    primary: '#00ffff',
    secondary: '#ff00ff',
    background: '#0a0a0a',
    accent: '#ffff00',
    text: '#ffffff'
  },
  minimal: {
    primary: '#4CAF50',
    secondary: '#2196F3',
    background: '#ffffff',
    accent: '#FF5722',
    text: '#333333'
  }
};