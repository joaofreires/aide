// @ts-check
/// <reference path="./types.d.ts" />

// IIFE: scopes all declarations so double-loading doesn't cause a SyntaxError.
// The guard inside prevents double-initialization and logs the second call stack.
;(function () {
  console.log('[aide] IIFE entered, readyState:', document.readyState, '| already init?', !!window.__aideApp)

  if (window.__aideApp) {
    console.warn('[aide] app.js running TWICE in the same context — skipping second init')
    console.trace('[aide] second-load call stack')
    return
  }
  window.__aideApp = true

  /** @type {import('../preload').AideAPI} */
  const aide = window.aide
  console.log('[aide] window.aide =', aide)

  // ── Toast ──────────────────────────────────────────────────────────────────

  /** @type {ReturnType<typeof setTimeout> | null} */
  let toastTimer = null

  /**
   * @param {string} msg
   * @param {'success' | 'error'} [type]
   */
  function toast(msg, type = 'success') {
    const el = document.getElementById('toast')
    if (!el) return
    el.textContent = msg
    el.className = type
    el.style.display = 'block'
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => { el.style.display = 'none' }, 3500)
  }

  /**
   * @param {string} id
   * @param {string} msg
   * @param {'show-success' | 'show-error' | 'show-info'} type
   */
  function setFeedback(id, msg, type) {
    const el = document.getElementById(id)
    if (!el) return
    el.textContent = msg
    el.className = `feedback ${type}`
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  /** @param {string} name */
  function showPage(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'))

    const page = document.querySelector(`.page[data-page="${name}"]`)
    if (page) page.classList.add('active')
    const btn = document.querySelector(`.nav-btn[data-page="${name}"]`)
    if (btn) btn.classList.add('active')

    if (name === 'mods') loadMods()
    if (name === 'projects') loadProjects()
    if (name === 'settings') loadSettings()
  }

  // ── Mods page ───────────────────────────────────────────────────────────────

  async function loadMods() {
    const el = document.getElementById('mods-list')
    if (!el) return
    el.innerHTML = '<div class="empty"><span class="empty-icon">⏳</span>Loading mods...</div>'
    try {
      console.log('[aide] calling aide.readRegistry()...')
      const registry = await aide.readRegistry()
      console.log('[aide] registry:', registry)
      const mods = Object.values(registry.mods)
      if (mods.length === 0) {
        el.innerHTML = `
          <div class="empty">
            <span class="empty-icon">📦</span>
            No mods installed yet.<br>
            Click <strong>Initialize ~/.aide</strong> to get started.
          </div>`
        return
      }
      el.innerHTML = mods.map(mod => `
        <div class="mod-item">
          <span class="badge badge-${mod.type}">${mod.type}</span>
          <span class="mod-name">${mod.id}</span>
          <span class="mod-version">v${mod.version}</span>
          <span class="mod-path">${mod.path}</span>
          <button class="btn btn-danger btn-sm remove-btn" data-mod-id="${mod.id}">Remove</button>
        </div>
      `).join('')

      el.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-mod-id')
          if (id) handleRemove(id)
        })
      })
    } catch (err) {
      console.error('[aide] readRegistry error:', err)
      el.innerHTML = `<div class="empty" style="color:var(--error)">Failed to load: ${err}</div>`
    }
  }

  async function handleInit() {
    const btn = /** @type {HTMLButtonElement} */ (document.getElementById('init-btn'))
    if (btn) btn.disabled = true
    try {
      const result = await aide.init()
      toast(
        result.already_existed
          ? '~/.aide is already initialized'
          : `Initialized ~/.aide — created: ${result.created_templates.join(', ')}`,
        'success'
      )
      loadMods()
    } catch (err) {
      toast(`Init failed: ${err}`, 'error')
    } finally {
      if (btn) btn.disabled = false
    }
  }

  /** @param {string} id */
  async function handleRemove(id) {
    try {
      await aide.remove(id)
      toast(`Removed mod "${id}"`, 'success')
      loadMods()
    } catch (err) {
      toast(`Failed to remove: ${err}`, 'error')
    }
  }

  // ── Templates page ──────────────────────────────────────────────────────────

  async function handleApply() {
    const templateSelect = /** @type {HTMLSelectElement} */ (document.getElementById('template-select'))
    const projectInput = /** @type {HTMLInputElement} */ (document.getElementById('project-path'))
    const applyBtn = /** @type {HTMLButtonElement} */ (document.getElementById('apply-btn'))
    if (!templateSelect || !projectInput) return

    const templateName = templateSelect.value
    const projectPath = projectInput.value.trim()

    if (!projectPath) {
      setFeedback('apply-status', 'Please enter a project path.', 'show-error')
      return
    }

    if (applyBtn) applyBtn.disabled = true
    try {
      const result = await aide.apply({ templateName, projectPath, confirm: true })
      setFeedback('apply-status', `✔ ${result.action}: ${result.file}`, 'show-success')
      toast(`Template applied successfully`, 'success')
    } catch (err) {
      setFeedback('apply-status', `Error: ${err}`, 'show-error')
    } finally {
      if (applyBtn) applyBtn.disabled = false
    }
  }

  // ── Projects page ───────────────────────────────────────────────────────────

  async function loadProjects() {
    const el = document.getElementById('projects-list')
    if (!el) return
    el.innerHTML = '<div class="empty"><span class="empty-icon">⏳</span>Loading...</div>'
    try {
      const registry = await aide.readRegistry()
      const projects = Object.values(registry.linked_projects)
      if (projects.length === 0) {
        el.innerHTML = '<div class="empty"><span class="empty-icon">🔗</span>No linked projects yet.</div>'
        return
      }
      el.innerHTML = projects.map(p => `
        <div class="project-item">
          <div style="flex:1;overflow:hidden;">
            <div class="project-path">${p.project_path}</div>
            <div class="project-templates">${
              p.applied_templates.length ? p.applied_templates.join(', ') : 'No templates applied'
            }</div>
          </div>
          <button class="btn btn-danger btn-sm unlink-btn" data-path="${p.project_path}">Unlink</button>
        </div>
      `).join('')

      el.querySelectorAll('.unlink-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const path = btn.getAttribute('data-path')
          if (path) handleUnlink(path)
        })
      })
    } catch (err) {
      el.innerHTML = `<div class="empty" style="color:var(--error)">Failed to load: ${err}</div>`
    }
  }

  async function handleLink() {
    const input = /** @type {HTMLInputElement} */ (document.getElementById('link-path'))
    const linkBtn = /** @type {HTMLButtonElement} */ (document.getElementById('link-btn'))
    if (!input) return

    const projectPath = input.value.trim()
    if (!projectPath) {
      setFeedback('link-status', 'Please enter a project path.', 'show-error')
      return
    }

    if (linkBtn) linkBtn.disabled = true
    try {
      await aide.link({ projectPath })
      setFeedback('link-status', `✔ Linked ${projectPath}`, 'show-success')
      input.value = ''
      toast(`Linked project`, 'success')
      loadProjects()
    } catch (err) {
      setFeedback('link-status', `Error: ${err}`, 'show-error')
    } finally {
      if (linkBtn) linkBtn.disabled = false
    }
  }

  /** @param {string} projectPath */
  async function handleUnlink(projectPath) {
    try {
      await aide.unlink(projectPath)
      toast(`Unlinked project`, 'success')
      loadProjects()
    } catch (err) {
      toast(`Failed to unlink: ${err}`, 'error')
    }
  }

  async function handleSync() {
    const btn = /** @type {HTMLButtonElement} */ (document.getElementById('sync-btn'))
    if (btn) btn.disabled = true
    try {
      const result = await aide.sync()
      const changed = result.propagated.filter(p => p.action !== 'skipped')
      toast(changed.length > 0 ? `Synced ${changed.length} file(s)` : 'Nothing to sync', 'success')
    } catch (err) {
      toast(`Sync failed: ${err}`, 'error')
    } finally {
      if (btn) btn.disabled = false
    }
  }

  // ── Settings page ───────────────────────────────────────────────────────────

  async function loadSettings() {
    const card = document.getElementById('settings-card')
    if (!card) return
    try {
      const config = await aide.readConfig()
      card.innerHTML = `
        <div class="settings-row">
          <div>
            <div class="settings-label">Auto Propagate</div>
            <div class="settings-desc">Sync template changes to linked projects automatically</div>
          </div>
          <span class="pill">${config.auto_propagate ? 'On' : 'Off'}</span>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-label">Confirm Before Write</div>
            <div class="settings-desc">Prompt before modifying files outside ~/.aide</div>
          </div>
          <span class="pill">${config.confirm_before_write ? 'On' : 'Off'}</span>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-label">Registry URL</div>
            <div class="settings-desc">Remote source for installing mods by name</div>
          </div>
          <span class="pill">${config.registry_url ?? 'Not set'}</span>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-label">Config file</div>
            <div class="settings-desc">Edit manually to change settings</div>
          </div>
          <span class="pill" style="font-family:monospace;font-size:10.5px;">~/.aide/config.json</span>
        </div>
      `
    } catch (err) {
      card.innerHTML = `<div class="empty" style="color:var(--error)">Failed to load config: ${err}</div>`
    }
  }

  // ── Discover page ───────────────────────────────────────────────────────────

  /** @type {Array<{path: string, type: string, already_imported: boolean}>} */
  let lastScanResults = []

  async function handleScan() {
    const scanBtn = /** @type {HTMLButtonElement} */ (document.getElementById('scan-btn'))
    const importBtn = /** @type {HTMLButtonElement} */ (document.getElementById('import-selected-btn'))
    const list = document.getElementById('discover-list')
    if (!list) return

    if (scanBtn) { scanBtn.disabled = true; scanBtn.textContent = 'Scanning...' }
    if (importBtn) importBtn.disabled = true
    list.innerHTML = '<div class="empty"><span class="empty-icon">⏳</span>Scanning your home directory...</div>'

    try {
      const result = await aide.discover()
      lastScanResults = result.found

      if (result.found.length === 0) {
        list.innerHTML = '<div class="empty"><span class="empty-icon">🔍</span>No AI context files found.</div>'
        return
      }

      const newCount = result.found.filter(f => !f.already_imported).length
      if (importBtn) importBtn.disabled = newCount === 0

      list.innerHTML = result.found.map((f, i) => `
        <div class="mod-item">
          <input type="checkbox" class="discover-check" data-index="${i}"
            style="flex-shrink:0;cursor:pointer;"
            ${f.already_imported ? 'disabled' : ''} />
          <span class="badge badge-${f.type}">${f.type}</span>
          <span class="mod-name">${f.name}</span>
          <span class="mod-path">${f.path}</span>
          ${f.already_imported ? '<span class="pill">Imported</span>' : ''}
        </div>
      `).join('')

      list.querySelectorAll('.discover-check').forEach(cb => {
        cb.addEventListener('change', () => {
          const anyChecked = [...list.querySelectorAll('.discover-check:not(:disabled)')]
            .some(c => /** @type {HTMLInputElement} */ (c).checked)
          if (importBtn) importBtn.disabled = !anyChecked
        })
      })
    } catch (err) {
      list.innerHTML = `<div class="empty" style="color:var(--error)">Scan failed: ${err}</div>`
    } finally {
      if (scanBtn) { scanBtn.disabled = false; scanBtn.textContent = 'Scan ~/ Now' }
    }
  }

  async function handleImportSelected() {
    const importBtn = /** @type {HTMLButtonElement} */ (document.getElementById('import-selected-btn'))
    const list = document.getElementById('discover-list')
    if (!list) return

    const checked = /** @type {HTMLInputElement[]} */ (
      [...list.querySelectorAll('.discover-check:not(:disabled)')]
        .filter(c => /** @type {HTMLInputElement} */ (c).checked)
    )
    if (checked.length === 0) return

    if (importBtn) importBtn.disabled = true
    let imported = 0
    const errors = []

    for (const cb of checked) {
      const idx = Number(cb.getAttribute('data-index'))
      const file = lastScanResults[idx]
      if (!file) continue
      try {
        await aide.add({ filePath: file.path, type: file.type })
        imported++
      } catch (err) {
        errors.push(`${file.name}: ${err}`)
      }
    }

    if (imported > 0) toast(`Imported ${imported} file${imported > 1 ? 's' : ''}`, 'success')
    if (errors.length > 0) setFeedback('discover-status', errors.join('\n'), 'show-error')

    // Re-scan to refresh already_imported state
    await handleScan()
  }

  // ── Bootstrap ───────────────────────────────────────────────────────────────

  function init() {
    console.log('[aide] init() called')
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.getAttribute('data-page')
        if (page) showPage(page)
      })
    })

    document.getElementById('init-btn')?.addEventListener('click', handleInit)
    document.getElementById('refresh-mods')?.addEventListener('click', loadMods)
    document.getElementById('apply-btn')?.addEventListener('click', handleApply)
    document.getElementById('link-btn')?.addEventListener('click', handleLink)
    document.getElementById('sync-btn')?.addEventListener('click', handleSync)
    document.getElementById('scan-btn')?.addEventListener('click', handleScan)
    document.getElementById('import-selected-btn')?.addEventListener('click', handleImportSelected)

    loadMods()
  }

  // Script is at the bottom of <body> — DOM is fully parsed
  init()
})()
