const sections = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('.nav-link');
const dots = document.querySelectorAll('.dot');

function setActive(id) {
  navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${id}`));
  dots.forEach(d => d.classList.toggle('active', d.dataset.target === id));
}

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
      const id = entry.target.id;
      setActive(id);
      history.replaceState(null, '', `#${id}`);
    }
  });
}, { threshold: 0.5 });

sections.forEach(sec => observer.observe(sec));

navLinks.forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();
    const target = document.querySelector(link.getAttribute('href'));
    target && target.scrollIntoView({ behavior: 'smooth' });
  });
});

const ctaLink = document.querySelector('.cta');
ctaLink && ctaLink.addEventListener('click', event => {
  event.preventDefault();
  const target = document.querySelector(ctaLink.getAttribute('href'));
  target && target.scrollIntoView({ behavior: 'smooth' });
});

let soothingVoice = null;
speechSynthesis.addEventListener('voiceschanged', () => {
  const voices = speechSynthesis.getVoices();
  // Prioritize male British voice for Jarvis-like sound
  soothingVoice = voices.find(voice => voice.lang === 'en-GB' && (voice.name.toLowerCase().includes('male') || !voice.name.toLowerCase().includes('female'))) ||
                  voices.find(voice => voice.lang === 'en-GB') ||
                  voices.find(voice => voice.name.includes('Daniel') || voice.name.includes('Paul') || voice.name.includes('Alex')) ||
                  voices.find(voice => !voice.name.toLowerCase().includes('female')) ||
                  voices[0];
});

const readBtn = document.getElementById('read-about');
if (readBtn) {
  readBtn.addEventListener('click', () => {
    // Cancel any ongoing speech
    speechSynthesis.cancel();
    const textElements = document.querySelectorAll('.about-text p, .about-text ul');
    let text = '';
    textElements.forEach(el => text += el.textContent + ' ');
    const utterance = new SpeechSynthesisUtterance(text.trim());
    // Jarvis-like settings: calm, British accent
    utterance.rate = 0.85; // Slightly slower
    utterance.pitch = 1.0; // Neutral pitch
    utterance.volume = 0.9; // Clear volume
    if (soothingVoice) utterance.voice = soothingVoice;
    window.speechSynthesis.speak(utterance);
  });
}

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const audioContext = AudioContext ? new AudioContext() : null;
  let ambientNodes = [];
  let musicEnabled = false;

  function stopAmbient() {
    ambientNodes.forEach(node => {
      node.osc.stop();
      node.osc.disconnect();
      node.gain.disconnect();
    });
    ambientNodes = [];
  }

  function startAmbient() {
    if (!audioContext || musicEnabled) return;
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
    const master = audioContext.createGain();
    master.gain.value = 0.2;
    master.connect(audioContext.destination);
    // layered pad 1
    const padNotes = [130, 160, 190];
    padNotes.forEach((freq, idx) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      osc.type = 'sine';
      osc.frequency.value = freq;
      filter.type = 'lowpass';
      filter.frequency.value = 500;

      gain.gain.value = 0;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      osc.start();
      const now = audioContext.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 1.0 + idx * 0.5);
      gain.gain.setValueAtTime(0.06, now + 12 + idx * 0.5);
      gain.gain.linearRampToValueAtTime(0, now + 15 + idx * 0.5);
      ambientNodes.push({osc, gain, filter});
    });

    // high shimmer layer
    const shimmer = audioContext.createOscillator();
    const shimmerGain = audioContext.createGain();
    shimmer.type = 'triangle';
    shimmer.frequency.value = 680;
    shimmerGain.gain.value = 0;
    shimmer.connect(shimmerGain);
    shimmerGain.connect(master);
    shimmer.start();
    let now = audioContext.currentTime;
    shimmerGain.gain.setValueAtTime(0, now);
    shimmerGain.gain.linearRampToValueAtTime(0.03, now + 2);
    shimmerGain.gain.setValueAtTime(0.03, now + 8);
    shimmerGain.gain.linearRampToValueAtTime(0, now + 14);
    ambientNodes.push({osc: shimmer, gain: shimmerGain});

    // subtle white noise layer
    const bufferSize = 2 * audioContext.sampleRate;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.02;
    }
    const noiseSource = audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    const noiseGain = audioContext.createGain();
    noiseGain.gain.value = 0.06;
    noiseSource.connect(noiseGain);
    noiseGain.connect(master);
    noiseSource.start();
    ambientNodes.push({osc: noiseSource, gain: noiseGain});

    musicEnabled = true;
  }

  function toggleAmbient() {
    const musicToggle = document.getElementById('musicToggle');
    if (!audioContext) return;
    if (!musicEnabled) {
      startAmbient();
      if (musicToggle) {
        musicToggle.textContent = 'Pause Music';
        musicToggle.classList.add('playing');
      }
    } else {
      stopAmbient();
      musicEnabled = false;
      if (musicToggle) {
        musicToggle.textContent = 'Play Music';
        musicToggle.classList.remove('playing');
      }
    }
  }

  document.body.addEventListener('click', () => {
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }, { once: true });

  const musicToggle = document.getElementById('musicToggle');
  const bgAudio = new Audio('Odyssey.mp3');
  bgAudio.loop = true;
  bgAudio.volume = 0.18;

  if (musicToggle) {
    musicToggle.addEventListener('click', () => {
      if (bgAudio.paused) {
        bgAudio.play().catch(() => {
          console.warn('Music start blocked, user interaction required.');
        });
        musicToggle.textContent = 'Pause Music';
        musicToggle.classList.add('playing');
      } else {
        bgAudio.pause();
        musicToggle.textContent = 'Play Music';
        musicToggle.classList.remove('playing');
      }
    });
    musicToggle.textContent = 'Play Music';
  }

dots.forEach(dot => {
  dot.addEventListener('click', () => {
    const target = document.getElementById(dot.dataset.target);
    target && target.scrollIntoView({ behavior: 'smooth' });
  });
});

let isThrottled = false;
window.addEventListener('wheel', event => {
  if (isThrottled) return;
  isThrottled = true;
  setTimeout(() => isThrottled = false, 450);
  const delta = Math.sign(event.deltaY);
  const current = [...sections].findIndex(s => s.getBoundingClientRect().top >= -10 && s.getBoundingClientRect().top < window.innerHeight / 2);
  if (current < 0) return;
  let nextIndex = current + delta;
  nextIndex = Math.max(0, Math.min(sections.length - 1, nextIndex));
  if (nextIndex !== current) {
    sections[nextIndex].scrollIntoView({ behavior: 'smooth' });
  }
});

window.addEventListener('keydown', event => {
  if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === 'ArrowUp' || event.key === 'PageUp') {
    event.preventDefault();
    const current = [...sections].findIndex(s => s.getBoundingClientRect().top >= -10 && s.getBoundingClientRect().top < window.innerHeight / 2);
    if (current < 0) return;
    let next = current;
    if (event.key === 'ArrowDown' || event.key === 'PageDown') next = Math.min(sections.length - 1, current + 1);
    if (event.key === 'ArrowUp' || event.key === 'PageUp') next = Math.max(0, current - 1);
    sections[next].scrollIntoView({ behavior: 'smooth' });
  }
});

// Matrix name typing effect
document.addEventListener('DOMContentLoaded', () => {
  // no audio in this version
  const nameSpan = document.querySelector('.matrix-name span');
  if (!nameSpan) return;
  const fullName = 'TEJAS SRIVASTAVA';
  nameSpan.textContent = '';
  let index = 0;
  setTimeout(() => {
    const typeInterval = setInterval(() => {
    if (index < fullName.length) {
      nameSpan.textContent += fullName[index++];
    } else {
      clearInterval(typeInterval);
    }
    }, 120);
  }, 175);
});
