/**
 * @fileoverview Main Application Logic & Router
 * Connects all modules, handles navigation, and UI state
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  
  // App State
  let currentSection = 'home';
  let chatHistory = [];

  // DOM Elements
  const els = {
    sections: document.querySelectorAll('.app-section'),
    navBtns: document.querySelectorAll('.nav-btn'),
    backBtns: document.querySelectorAll('.btn-back'),
    headerTitle: document.getElementById('header-title'),
    // Chat
    chatInput: document.getElementById('chat-input'),
    chatSendBtn: document.getElementById('chat-send-btn'),
    chatVoiceBtn: document.getElementById('chat-voice-btn'),
    chatMessages: document.getElementById('chat-messages'),
    chatQuickReplies: document.getElementById('chat-quick-replies'),
    // Navigation
    navSearch: document.getElementById('nav-search'),
    navResults: document.getElementById('nav-results'),
    navClearBtn: document.getElementById('nav-clear-route'),
    navDirections: document.getElementById('nav-directions-panel'),
    // Settings
    langSelect: document.getElementById('lang-select'),
    highContrastToggle: document.getElementById('high-contrast-toggle'),
    reduceMotionToggle: document.getElementById('reduce-motion-toggle'),
    geminiKeyInput: document.getElementById('gemini-key-input')
  };

  /* =========================================================================
   * INITIALIZATION
   * ========================================================================= */
  
  function init() {
    // 1. Initialize Modules
    I18n.init();
    Emergency.init();
    Wayfinding.renderMap('svg-map-container');
    Tickets.renderTicket('ticket-container');
    Tickets.renderSchedule('schedule-container');
    Tickets.renderFanZone('fanzone-container');
    Emergency.renderContacts('contacts-container');

    // 2. Setup Event Listeners
    setupNavigation();
    setupChat();
    setupWayfinding();
    setupSettings();
    setupPWA();

    // 3. Dashboard
    renderDashboard();
    startDashboardClock();

    // 4. Initial UI State
    updateLanguageUI();

    // Restore persisted accessibility settings
    if (Utils.getStorage('ss_high_contrast', false)) {
      document.body.classList.add('high-contrast');
      if (els.highContrastToggle) els.highContrastToggle.checked = true;
    }
    if (Utils.getStorage('ss_reduce_motion', false)) {
      document.body.classList.add('reduce-motion');
      if (els.reduceMotionToggle) els.reduceMotionToggle.checked = true;
    }

    const savedKey = Utils.getStorage('ss_gemini_key', '');
    if (els.geminiKeyInput && savedKey) {
      els.geminiKeyInput.value = savedKey;
    }

    // Hide loader
    setTimeout(() => {
      const loader = document.getElementById('app-loader');
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
      }
    }, 1000);
  }

  /* =========================================================================
   * NAVIGATION & ROUTING
   * ========================================================================= */

  function setupNavigation() {
    els.navBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget.dataset.target;
        if (target) switchSection(target);
      });
    });

    els.backBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        switchSection('home');
      });
    });

    // Custom event navigation
    document.addEventListener('navigateToActivity', (e) => {
      switchSection('navigate');
      // In a real app, we'd trigger a route to the specific activity here
    });
  }

  function switchSection(sectionId) {
    if (currentSection === sectionId) return;

    // Handle leaving current section
    if (currentSection === 'crowd') {
      CrowdManager.stopSimulation();
    }

    // Hide all
    els.sections.forEach(sec => sec.classList.remove('active'));
    els.navBtns.forEach(btn => btn.classList.remove('active'));

    // Show target
    const targetEl = document.getElementById(`section-${sectionId}`);
    if (targetEl) targetEl.classList.add('active');

    const targetNav = document.querySelector(`.nav-btn[data-target="${sectionId}"]`);
    if (targetNav) targetNav.classList.add('active');

    // Update Header
    updateHeader(sectionId);

    // Handle entering new section
    if (sectionId === 'crowd') {
      setTimeout(() => {
        CrowdManager.initCanvas('heatmap-canvas');
        CrowdManager.startSimulation();
        updateCrowdPredictions();
      }, 100); // Slight delay for DOM to render
    }

    currentSection = sectionId;
    window.scrollTo(0, 0);
  }

  function updateHeader(sectionId) {
    if (sectionId === 'home') {
      els.headerTitle.innerHTML = `<span class="gold-text">Smart</span>Stadium`;
    } else {
      els.headerTitle.textContent = I18n.t(`${sectionId}.title`) || sectionId.toUpperCase();
    }
  }

  /* =========================================================================
   * ENTERPRISE DASHBOARD
   * =========================================================================
   *
   * Populates the #dashboard-insights grid with AI insight cards generated
   * by AIEngine.generateDashboardInsights(). Each card shows:
   *   - Agent name badge and severity indicator
   *   - AI recommendation (always visible)
   *   - Reasoning + confidence + impact (expandable accordion)
   *
   * All HTML is built with string templates and set via Utils.setHTML so that
   * DOMPurify sanitizes the output before insertion.
   */

  /**
   * Render all AI insight cards into the #dashboard-insights container.
   * Called once on init. Event delegation handles accordion toggling.
   */
  function renderDashboard() {
    const container = document.getElementById('dashboard-insights');
    if (!container) return;

    const insights = AIEngine.generateDashboardInsights();
    if (!insights || !insights.length) return;

    // Build HTML for all cards
    const cardsHtml = insights.map((ins, idx) => {
      const bodyId = `insight-body-${ins.id}`;
      const toggleId = `insight-toggle-${ins.id}`;
      return `
        <article
          class="insight-card severity-${Utils.escapeHtml(ins.severity)}"
          aria-label="${Utils.escapeHtml(ins.title)} — ${Utils.escapeHtml(ins.severity)} severity"
        >
          <div class="insight-card-header">
            <span class="insight-icon" aria-hidden="true">${Utils.escapeHtml(ins.icon)}</span>
            <div class="insight-header-text">
              <h3 class="insight-title">${Utils.escapeHtml(ins.title)}</h3>
              <span class="insight-agent-badge">🤖 ${Utils.escapeHtml(ins.agent)}</span>
            </div>
            <span
              class="insight-severity-badge ${Utils.escapeHtml(ins.severity)}"
              aria-label="Severity: ${Utils.escapeHtml(ins.severity)}"
            >${Utils.escapeHtml(ins.severity.toUpperCase())}</span>
          </div>

          <div class="insight-recommendation" role="region" aria-label="AI Recommendation">
            <div class="insight-recommendation-label">💡 AI Recommendation</div>
            <p class="insight-recommendation-text">${Utils.escapeHtml(ins.recommendation)}</p>
          </div>

          <div class="insight-details">
            <button
              id="${toggleId}"
              class="insight-details-toggle"
              aria-expanded="false"
              aria-controls="${bodyId}"
              data-body-id="${bodyId}"
            >
              <span>Reasoning &amp; Evidence</span>
              <i class="toggle-chevron" aria-hidden="true">▾</i>
            </button>
            <div id="${bodyId}" class="insight-details-body" role="region" aria-labelledby="${toggleId}" hidden>
              <p class="insight-reasoning-label">AI Reasoning</p>
              <p class="insight-reasoning-text">${Utils.escapeHtml(ins.reasoning)}</p>
              <div class="insight-meta-row">
                <div class="insight-meta-item">
                  <span class="insight-meta-label">Confidence</span>
                  <span class="insight-meta-value">${Utils.escapeHtml(String(ins.confidence))}%</span>
                  <div class="confidence-bar" aria-hidden="true">
                    <div class="confidence-track">
                      <div class="confidence-fill" style="width:${Utils.escapeHtml(String(ins.confidence))}%"></div>
                    </div>
                    <span class="confidence-label">${Utils.escapeHtml(String(ins.confidence))}%</span>
                  </div>
                </div>
              </div>
              <p class="insight-impact-text"><strong>Impact:</strong> ${Utils.escapeHtml(ins.impact)}</p>
            </div>
          </div>
        </article>
      `;
    }).join('');

    Utils.setHTML(container, cardsHtml);

    // Wire accordion toggles using event delegation on the container
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.insight-details-toggle');
      if (!btn) return;

      const bodyId = btn.dataset.bodyId;
      const body = document.getElementById(bodyId);
      if (!body) return;

      const isExpanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!isExpanded));

      if (isExpanded) {
        body.classList.remove('open');
        body.hidden = true;
      } else {
        body.classList.add('open');
        body.hidden = false;
      }
    });

    // Keyboard accessibility: allow Enter/Space on insight cards
    container.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const btn = e.target.closest('.insight-details-toggle');
        if (btn) {
          e.preventDefault();
          btn.click();
        }
      }
    });
  }

  /**
   * Start the live dashboard clock, updating #dash-clock every second.
   * Uses EST (America/New_York) to match stadium timezone.
   */
  function startDashboardClock() {
    const clockEl = document.getElementById('dash-clock');
    if (!clockEl) return;

    function tick() {
      try {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', {
          timeZone: 'America/New_York',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        clockEl.textContent = timeStr + ' EST';
      } catch (_) {
        clockEl.textContent = new Date().toLocaleTimeString();
      }
    }

    tick();
    setInterval(tick, 1000);
  }

  /* =========================================================================
   * CHAT / AI ASSISTANT
   * ========================================================================= */

  function setupChat() {
    if (!els.chatSendBtn) return;

    // Send button
    els.chatSendBtn.addEventListener('click', handleChatSubmit);
    
    // Enter key
    els.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleChatSubmit();
    });

    // Voice button
    if (AIEngine.isVoiceSupported()) {
      els.chatVoiceBtn.addEventListener('click', toggleVoiceInput);
    } else {
      els.chatVoiceBtn.style.display = 'none';
    }

    // Quick replies
    els.chatQuickReplies.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') {
        els.chatInput.value = e.target.textContent;
        handleChatSubmit();
      }
    });

    // Add initial greeting and dummy conversation if history is empty
    if (chatHistory.length === 0) {
      appendChatMessage('bot', 'Hi! I am your SmartStadium Assistant. How can I help you today?');
      setTimeout(() => {
        appendChatMessage('user', 'Where can I find some good food?');
        setTimeout(() => {
          appendChatMessage('bot', 'We have many great options! For a **Classic** stadium experience, you can get a Stadium Hot Dog for $9 at any concession stand. If you want something international, the **Tacos al Pastor** at the Azteca stands are amazing!\n\nWould you like me to show you the way to the nearest food stand?');
        }, 1000);
      }, 500);
    }
  }

  async function handleChatSubmit() {
    const text = els.chatInput.value.trim();
    if (!text) return;

    els.chatInput.value = '';
    
    // Stop any ongoing speech
    AIEngine.stopSpeaking();

    // 1. Add user message to UI
    appendChatMessage('user', text);

    // 2. Show typing indicator
    const typingId = 'typing-' + Date.now();
    appendChatMessage('bot', '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>', typingId);
    
    // Scroll to bottom
    scrollToChatBottom();

    // 3. Get response from AI Engine
    try {
      const response = await AIEngine.respond(text, {
        stadium: 'MetLife Stadium',
        language: I18n.getLang()
      });

      // 4. Replace typing indicator with actual response
      const typingEl = document.getElementById(typingId);
      if (typingEl) typingEl.remove();

      appendChatMessage('bot', response);
      
      // Auto-speak response if last input was voice
      if (Utils.getStorage('ss_last_input_voice', false)) {
        AIEngine.speak(response);
        Utils.setStorage('ss_last_input_voice', false);
      }

    } catch (err) {
      console.error(err);
      const typingEl = document.getElementById(typingId);
      if (typingEl) typingEl.remove();
      appendChatMessage('bot', '⚠️ Sorry, I encountered an error. Please try again.');
    }
  }

  /**
   * Append a chat message to the conversation thread.
   * Bot messages: basic markdown rendered safely via DOMPurify (through Utils.setHTML).
   * User messages: always escaped, never interpreted as HTML.
   * @param {'bot'|'user'} sender
   * @param {string} text - Raw text or markdown (bot) / raw text (user)
   * @param {string|null} [id] - Optional element id (used for typing indicators)
   */
  function appendChatMessage(sender, text, id = null) {
    const msg = document.createElement('div');
    msg.className = `chat-message ${sender}`;
    if (id) msg.id = id;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    if (sender === 'bot') {
      // Render safe markdown subset: bold, italic, line-breaks.
      // Utils.setHTML internally routes through DOMPurify.
      const escaped = Utils.escapeHtml(text);
      const md = escaped
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
      Utils.setHTML(bubble, md);
    } else {
      // User input: plain text only, no HTML interpretation.
      bubble.textContent = text;
    }

    msg.appendChild(bubble);
    els.chatMessages.appendChild(msg);
    chatHistory.push({ sender, text });
    scrollToChatBottom();
  }

  function scrollToChatBottom() {
    els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
  }

  function toggleVoiceInput() {
    if (AIEngine.isListening()) {
      AIEngine.stopListening();
      els.chatVoiceBtn.classList.remove('listening');
      els.chatInput.placeholder = I18n.t('chat.placeholder');
    } else {
      els.chatInput.placeholder = 'Listening...';
      els.chatVoiceBtn.classList.add('listening');
      
      const success = AIEngine.startListening(
        // On Result
        (transcript) => {
          els.chatInput.value = transcript;
          Utils.setStorage('ss_last_input_voice', true);
          handleChatSubmit();
        },
        // On Error
        (errMsg) => {
          Utils.announce(errMsg, 'assertive');
          els.chatInput.placeholder = I18n.t('chat.placeholder');
          els.chatVoiceBtn.classList.remove('listening');
        },
        // On End
        () => {
          els.chatVoiceBtn.classList.remove('listening');
          if (!els.chatInput.value) {
            els.chatInput.placeholder = I18n.t('chat.placeholder');
          }
        }
      );
    }
  }

  /* =========================================================================
   * WAYFINDING
   * ========================================================================= */

  function setupWayfinding() {
    if (!els.navSearch) return;

    // Populate dropdown
    let optionsHtml = '<option value="" disabled selected data-i18n="navigate.searchPlaceholder">Select a destination...</option>';
    
    // Group facilities for better UX
    const groups = {
      'Gates': ['gateA', 'gateB', 'gateC', 'gateD'],
      'Food & Drink': ['food1', 'food2'],
      'Restrooms': ['toilet1', 'toilet2'],
      'Medical & Safety': ['med1', 'med2', 'exit1', 'exit2']
    };

    Object.keys(groups).forEach(groupName => {
      optionsHtml += `<optgroup label="${groupName}">`;
      groups[groupName].forEach(id => {
        if (Wayfinding.FACILITIES[id]) {
          const f = Wayfinding.FACILITIES[id];
          optionsHtml += `<option value="${id}">${f.icon} ${f.label} ${f.accessible ? '♿' : ''}</option>`;
        }
      });
      optionsHtml += `</optgroup>`;
    });
    els.navSearch.innerHTML = optionsHtml;

    els.navSearch.addEventListener('change', (e) => {
      const id = e.target.value;
      if (id) {
        els.navResults.innerHTML = '';
        Wayfinding.navigateTo(id, {
          onDirections: (directions, facility) => {
            renderDirections(directions, facility);
          }
        });
      }
    });

    els.navClearBtn?.addEventListener('click', () => {
      Wayfinding.clearRoute();
      els.navDirections.innerHTML = '';
      els.navDirections.classList.remove('show');
      els.navClearBtn.style.display = 'none';
      els.navSearch.value = '';
    });

    // Seed dummy data for demo purposes
    setTimeout(() => {
      Wayfinding.navigateTo('food1', {
        onDirections: (directions, facility) => {
          renderDirections(directions, facility);
        }
      });
    }, 1500);
  }

  // showNavResults is removed as we use a dropdown now

  function renderDirections(directions, facility) {
    if (!els.navDirections) return;
    
    let html = `
      <div class="directions-header">
        <h3>Route to ${facility.icon} ${facility.label}</h3>
        <button class="btn btn-icon btn-close-dir" aria-label="Close directions">✕</button>
      </div>
      <div class="directions-list">
    `;

    directions.forEach((d, i) => {
      let text = d.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html += `
        <div class="direction-step">
          <div class="step-icon">${d.icon}</div>
          <div class="step-text">${text}</div>
        </div>
      `;
    });

    html += `</div>`;
    els.navDirections.innerHTML = html;
    els.navDirections.classList.add('show');
    if (els.navClearBtn) els.navClearBtn.style.display = 'block';

    els.navDirections.querySelector('.btn-close-dir').addEventListener('click', () => {
      els.navDirections.classList.remove('show');
    });
  }

  /* =========================================================================
   * CROWD MANAGEMENT UI
   * ========================================================================= */

  function updateCrowdPredictions() {
    const container = document.getElementById('crowd-predictions');
    if (!container) return;

    // Update every 5 seconds
    setInterval(() => {
      if (currentSection !== 'crowd') return;
      
      const predictions = CrowdManager.generatePredictions();
      let html = '';
      
      predictions.forEach(p => {
        html += `
          <div class="prediction-card border-${p.severity}">
            <div class="pred-header">
              <span class="pred-zone">${p.zone}</span>
              <span class="pred-badge bg-${p.severity}">${p.severity.toUpperCase()}</span>
            </div>
            <p class="pred-text">${p.prediction}</p>
            <div class="pred-action">
              <span class="icon">💡</span>
              <span>${p.action}</span>
            </div>
          </div>
        `;
      });
      
      container.innerHTML = html;
    }, 5000);
  }

  /* =========================================================================
   * UI & SETTINGS
   * ========================================================================= */

  function setupSettings() {
    // Language
    if (els.langSelect) {
      const langs = I18n.getLanguages();
      let options = '';
      Object.keys(langs).forEach(code => {
        options += `<option value="${code}">${langs[code].flag} ${langs[code].nativeName}</option>`;
      });
      els.langSelect.innerHTML = options;
      els.langSelect.value = I18n.getLang();

      els.langSelect.addEventListener('change', (e) => {
        I18n.setLanguage(e.target.value);
        updateLanguageUI();
      });
    }

    // High Contrast
    if (els.highContrastToggle) {
      els.highContrastToggle.addEventListener('change', (e) => {
        document.body.classList.toggle('high-contrast', e.target.checked);
        Utils.setStorage('ss_high_contrast', e.target.checked);
      });
    }

    // Reduce Motion
    if (els.reduceMotionToggle) {
      els.reduceMotionToggle.addEventListener('change', (e) => {
        document.body.classList.toggle('reduce-motion', e.target.checked);
        Utils.setStorage('ss_reduce_motion', e.target.checked);
      });
    }

    // Gemini API Key
    if (els.geminiKeyInput) {
      els.geminiKeyInput.addEventListener('change', (e) => {
        Utils.setStorage('ss_gemini_key', e.target.value.trim());
      });
    }
  }

  function updateLanguageUI() {
    // Update elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = I18n.t(key);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = text;
      } else {
        el.textContent = text;
      }
    });

    // Update Quick Replies
    if (els.chatQuickReplies) {
      const replies = I18n.t('chat.quickReplies');
      if (Array.isArray(replies)) {
        els.chatQuickReplies.innerHTML = replies.map(r => `<button class="quick-reply-btn">${r}</button>`).join('');
      }
    }

    // Update Header
    updateHeader(currentSection);

    // Re-render dynamic content
    Tickets.renderTicket('ticket-container');
    Tickets.renderSchedule('schedule-container');
    Tickets.renderFanZone('fanzone-container');
  }



  /* =========================================================================
   * PWA SERVICE WORKER
   * ========================================================================= */
  function setupPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('SW registered:', reg.scope))
          .catch(err => console.warn('SW registration failed:', err));
      });
    }
  }

  // Run initialization
  init();

});
