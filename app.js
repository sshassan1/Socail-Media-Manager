(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const root = document.documentElement;
  const state = {
    view: 'dashboard',
    preview: 'all',
    selectedPlatforms: new Set(['facebook', 'instagram', 'x', 'linkedin']),
    themePreference: localStorage.getItem('socialflow-theme') || 'light',
    mediaUrl: null,
    publishedCount: 128,
  };

  const viewTitles = {
    dashboard: 'Overview',
    composer: 'Create post',
    calendar: 'Calendar',
    posts: 'Posts',
    analytics: 'Analytics',
    media: 'Media library',
    accounts: 'Connected accounts',
    notifications: 'Notifications',
    settings: 'Settings',
  };

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function getTheme() {
    if (state.themePreference === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return state.themePreference;
  }

  function applyTheme(preference = state.themePreference) {
    state.themePreference = preference;
    root.dataset.theme = getTheme();
    localStorage.setItem('socialflow-theme', preference);
    $$('[data-set-theme]').forEach((button) => {
      button.classList.toggle('active', button.dataset.setTheme === preference);
    });
  }

  function showView(view, shouldScroll = true) {
    if (!viewTitles[view]) return;
    state.view = view;
    $$('[data-view-panel]').forEach((panel) => panel.classList.toggle('active', panel.dataset.viewPanel === view));
    $$('.nav-item[data-view]').forEach((item) => item.classList.toggle('active', item.dataset.view === view));
    const breadcrumb = $('#breadcrumb-current');
    if (breadcrumb) breadcrumb.textContent = viewTitles[view];
    closeSidebar();
    if (shouldScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    const focusTarget = $('input, textarea, button', modal);
    if (focusTarget) window.setTimeout(() => focusTarget.focus(), 50);
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function closeOpenModals() {
    $$('.modal-backdrop.open').forEach((modal) => closeModal(modal.id));
  }

  function closeSidebar() {
    $('#sidebar')?.classList.remove('open');
    $('#mobile-overlay')?.classList.remove('open');
  }

  function showToast(title, message, tone = 'success') {
    const region = $('#toast-region');
    if (!region) return;
    const icon = tone === 'warning' ? 'i-alert' : tone === 'info' ? 'i-sparkle' : 'i-check';
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<div class="toast-icon"><svg><use href="#${icon}"></use></svg></div><div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span></div><button class="icon-button toast-close" aria-label="Dismiss"><svg><use href="#i-close"></use></svg></button>`;
    region.appendChild(toast);
    const remove = () => {
      toast.classList.add('removing');
      window.setTimeout(() => toast.remove(), 180);
    };
    $('.toast-close', toast).addEventListener('click', remove);
    window.setTimeout(remove, 4800);
  }

  function formatBytes(bytes) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function updateCaptionPreview() {
    const textarea = $('#post-caption');
    if (!textarea) return;
    const value = textarea.value;
    const count = $('#caption-count');
    if (count) count.textContent = `${value.length.toLocaleString()} / 2,200`;
    const rendered = escapeHtml(value).replace(/(#[\w-]+)/g, '<span>$1</span>').replace(/\n/g, '<br>');
    $$('[data-preview-copy]').forEach((copy) => {
      copy.innerHTML = rendered || 'Your caption preview will appear here.';
    });
  }

  function setPreview(platform) {
    state.preview = platform;
    $$('.preview-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.previewPlatform === platform));
    $$('[data-card-platform]').forEach((card) => card.classList.toggle('hidden-preview', platform !== 'all' && card.dataset.cardPlatform !== platform));
  }

  function updatePlatformSelection() {
    $$('.platform-select').forEach((button) => {
      const isSelected = state.selectedPlatforms.has(button.dataset.platform);
      button.classList.toggle('selected', isSelected);
      button.setAttribute('aria-pressed', String(isSelected));
    });
  }

  function handleFile(file) {
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'video/mp4'];
    if (!allowed.includes(file.type)) {
      showToast('Unsupported media format', 'Choose a PNG, JPG, WEBP, or MP4 file.', 'warning');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      showToast('File is too large', 'Media must be smaller than 100 MB.', 'warning');
      return;
    }
    if (state.mediaUrl) URL.revokeObjectURL(state.mediaUrl);
    state.mediaUrl = URL.createObjectURL(file);
    const thumb = $('#media-thumb');
    const chip = $('#uploaded-media');
    if (!thumb || !chip) return;
    thumb.innerHTML = file.type.startsWith('video/')
      ? `<video src="${state.mediaUrl}" muted></video>`
      : `<img src="${state.mediaUrl}" alt="Selected media preview" />`;
    $('#media-name').textContent = file.name;
    $('#media-size').textContent = `${formatBytes(file.size)} · Ready to publish`;
    chip.classList.remove('hidden');
    showToast('Media ready', `${file.name} is attached to your draft.`);
  }

  function addPublishedRow(title, status = 'published') {
    const rows = $('#posts-rows');
    if (!rows) return;
    const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
    const row = document.createElement('div');
    row.className = 'post-row';
    row.dataset.status = status;
    row.innerHTML = `<div class="post-cell post-info"><div class="post-thumbnail art-thumb"><span>create<br/><em>what matters</em></span></div><div><strong>${escapeHtml(title)}</strong><span>Building the future with Artificial Intelligence 🚀</span></div></div><div class="platform-stack"><span class="platform-badge facebook"><svg><use href="#i-facebook"></use></svg></span><span class="platform-badge instagram"><svg><use href="#i-instagram"></use></svg></span><span class="platform-badge x"><svg><use href="#i-x"></use></svg></span><span class="platform-badge linkedin"><svg><use href="#i-linkedin"></use></svg></span></div><span class="status-badge ${status}"><i></i> ${statusLabel}</span><span class="post-date">Oct 01, 2026 <small>Just now</small></span><span class="engagement"><strong>${status === 'published' ? 'New' : '—'}</strong><small>${status === 'published' ? 'Collecting data' : 'Queued'}</small></span><button class="icon-button" aria-label="More options"><svg><use href="#i-more"></use></svg></button>`;
    rows.prepend(row);
  }

  function publishNow() {
    if (!state.selectedPlatforms.size) {
      showToast('Select a channel first', 'Choose at least one connected platform to publish.', 'warning');
      return;
    }
    const title = ($('#post-caption')?.value.split('\n').find(Boolean) || 'Untitled social post').slice(0, 64);
    addPublishedRow(title, 'published');
    state.publishedCount += 1;
    showToast('Publishing started', `${state.selectedPlatforms.size} independent jobs were added to the queue.`);
    window.setTimeout(() => showToast('Post published', 'Your post is live on the selected channels.'), 1200);
  }

  function saveDraft() {
    const title = ($('#post-caption')?.value.split('\n').find(Boolean) || 'Untitled draft').slice(0, 64);
    addPublishedRow(title, 'draft');
    showToast('Draft saved', 'Your changes are safe and ready for another pass.');
  }

  function filterPosts(status = 'all') {
    $$('.segmented-control button').forEach((button) => button.classList.toggle('active', button.dataset.postFilter === status));
    const query = ($('#post-search')?.value || '').trim().toLowerCase();
    $$('.post-row').forEach((row) => {
      const matchesStatus = status === 'all' || row.dataset.status === status;
      const matchesQuery = !query || row.textContent.toLowerCase().includes(query);
      row.classList.toggle('hidden', !(matchesStatus && matchesQuery));
    });
  }

  function markNotificationsRead() {
    $$('.notification-item.unread').forEach((item) => {
      item.classList.remove('unread');
      $('.notification-unread-dot', item)?.remove();
    });
    const count = $('.nav-count-alert');
    if (count) count.textContent = '0';
    showToast('Notifications cleared', 'You are all caught up.');
  }

  function bindEvents() {
    document.addEventListener('click', (event) => {
      const viewTrigger = event.target.closest('[data-view]');
      if (viewTrigger) {
        event.preventDefault();
        showView(viewTrigger.dataset.view);
        closeOpenModals();
        return;
      }

      const composerTrigger = event.target.closest('[data-open-composer]');
      if (composerTrigger) {
        event.preventDefault();
        showView('composer');
        closeOpenModals();
        return;
      }

      const closeTrigger = event.target.closest('[data-close-modal]');
      if (closeTrigger) {
        closeModal(closeTrigger.dataset.closeModal);
        return;
      }

      if (event.target.classList.contains('modal-backdrop')) {
        closeModal(event.target.id);
      }
    });

    $('#menu-toggle')?.addEventListener('click', () => {
      $('#sidebar')?.classList.add('open');
      $('#mobile-overlay')?.classList.add('open');
    });
    $('#sidebar-close')?.addEventListener('click', closeSidebar);
    $('#mobile-overlay')?.addEventListener('click', closeSidebar);

    $('#theme-toggle')?.addEventListener('click', () => {
      applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
    });

    $$('.appearance-option').forEach((button) => {
      button.addEventListener('click', () => applyTheme(button.dataset.setTheme));
    });
    $$('.settings-nav button').forEach((button) => {
      button.addEventListener('click', () => {
        const tab = button.dataset.settingsTab;
        $$('.settings-nav button').forEach((item) => item.classList.toggle('active', item === button));
        $$('.settings-tab').forEach((panel) => panel.classList.toggle('active', panel.dataset.settingsPanel === tab));
      });
    });

    $('#search-trigger')?.addEventListener('click', () => openModal('command-modal'));
    $('#command-input')?.addEventListener('input', (event) => {
      const query = event.target.value.toLowerCase().trim();
      $$('.command-group button').forEach((button) => {
        button.classList.toggle('hidden', Boolean(query) && !button.textContent.toLowerCase().includes(query));
      });
    });

    $$('.preview-tab').forEach((tab) => tab.addEventListener('click', () => setPreview(tab.dataset.previewPlatform)));
    $$('.platform-select').forEach((button) => {
      button.addEventListener('click', () => {
        const platform = button.dataset.platform;
        if (state.selectedPlatforms.has(platform)) state.selectedPlatforms.delete(platform);
        else state.selectedPlatforms.add(platform);
        updatePlatformSelection();
      });
    });
    $('#select-all-platforms')?.addEventListener('click', () => {
      const all = ['facebook', 'instagram', 'x', 'linkedin'];
      const hasAll = all.every((platform) => state.selectedPlatforms.has(platform));
      state.selectedPlatforms = new Set(hasAll ? [] : all);
      updatePlatformSelection();
    });

    $('#post-caption')?.addEventListener('input', updateCaptionPreview);
    $('#save-draft')?.addEventListener('click', saveDraft);
    $('#publish-now')?.addEventListener('click', publishNow);
    $('#schedule-post')?.addEventListener('click', () => openModal('schedule-modal'));
    $('#confirm-schedule')?.addEventListener('click', () => {
      const title = ($('#post-caption')?.value.split('\n').find(Boolean) || 'Untitled scheduled post').slice(0, 64);
      addPublishedRow(title, 'scheduled');
      closeModal('schedule-modal');
      showToast('Post scheduled', 'It will publish independently at the selected time.');
    });
    $('#ai-assist')?.addEventListener('click', () => {
      const textarea = $('#post-caption');
      if (!textarea) return;
      textarea.value = 'The future of thoughtful work is being shaped right now. 🚀\n\nThe best ideas happen when people and technology have room to make something meaningful together.\n\nWhat are you building next?\n\n#AI #Technology #Innovation';
      updateCaptionPreview();
      showToast('AI suggestion ready', 'Review the rewritten draft before publishing.', 'info');
    });

    const mediaInput = $('#media-input');
    $('#choose-media')?.addEventListener('click', () => mediaInput?.click());
    $('#media-upload-button')?.addEventListener('click', () => mediaInput?.click());
    $('#library-upload')?.addEventListener('click', () => mediaInput?.click());
    mediaInput?.addEventListener('change', (event) => handleFile(event.target.files?.[0]));
    $('#remove-media')?.addEventListener('click', () => {
      $('#uploaded-media')?.classList.add('hidden');
      if (mediaInput) mediaInput.value = '';
      if (state.mediaUrl) URL.revokeObjectURL(state.mediaUrl);
      state.mediaUrl = null;
      showToast('Media removed', 'The original file remains unchanged on your device.', 'info');
    });
    const dropzone = $('#media-dropzone');
    ['dragenter', 'dragover'].forEach((name) => dropzone?.addEventListener(name, (event) => {
      event.preventDefault();
      dropzone.classList.add('dragging');
    }));
    ['dragleave', 'drop'].forEach((name) => dropzone?.addEventListener(name, (event) => {
      event.preventDefault();
      dropzone.classList.remove('dragging');
    }));
    dropzone?.addEventListener('drop', (event) => handleFile(event.dataTransfer?.files?.[0]));

    $$('.segmented-control button').forEach((button) => button.addEventListener('click', () => filterPosts(button.dataset.postFilter)));
    $('#post-search')?.addEventListener('input', () => {
      const active = $('.segmented-control button.active')?.dataset.postFilter || 'all';
      filterPosts(active);
    });
    $('#mark-all-read')?.addEventListener('click', markNotificationsRead);
    $('#save-settings')?.addEventListener('click', () => showToast('Settings saved', 'Your workspace preferences are up to date.'));
    $('#connect-account')?.addEventListener('click', () => showToast('OAuth connection ready', 'In production, this opens the platform’s official authorization page.', 'info'));

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeOpenModals();
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openModal('command-modal');
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        showView('composer');
      }
    });
  }

  function init() {
    applyTheme();
    updateCaptionPreview();
    updatePlatformSelection();
    setPreview('all');
    bindEvents();
  }

  init();
})();
