import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Archive, ArrowRight, Check, Database, Download, ExternalLink, Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, ShieldCheck, Trash2, Upload, Volume2, Wifi } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useProvider } from '../context/ProviderContext'
import { createBackup, downloadBlob, importBackup } from '../lib/backup'
import { decryptBundle, encryptBundle, type SecretBundle } from '../lib/crypto'
import { db, type EncryptedCredentialRecord } from '../lib/db'
import { checkConnection, providerDetails, type ProviderId } from '../lib/providers'

const providers: ProviderId[] = ['demo', 'openai', 'anthropic', 'gemini', 'openrouter', 'custom']

export function SettingsPage() {
  const { config, falKey, setFalKey, setProvider, updateConfig, replaceSecrets, clearSecrets } = useProvider()
  const [ready, setReady] = useState(false)
  const [showAiKey, setShowAiKey] = useState(false)
  const [showFalKey, setShowFalKey] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('')
  const [checking, setChecking] = useState(false)
  const [remember, setRemember] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  const [hasEncrypted, setHasEncrypted] = useState(false)
  const [credentialStatus, setCredentialStatus] = useState('')
  const [includeMedia, setIncludeMedia] = useState(false)
  const [backupStatus, setBackupStatus] = useState('')
  const importInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    void Promise.all([db.preferences.get('provider-preferences'), db.preferences.get('encrypted-provider-credentials')]).then(([preference, encrypted]) => {
      if (!active) return
      const value = preference?.value as { provider?: ProviderId; model?: string; endpoint?: string } | undefined
      if (value?.provider && providers.includes(value.provider)) {
        replaceSecrets({ provider: value.provider, model: value.model || providerDetails[value.provider].defaultModel, endpoint: value.endpoint, apiKey: '' })
      }
      setHasEncrypted(!!encrypted)
      setReady(true)
    })
    return () => { active = false }
  }, [replaceSecrets])

  useEffect(() => {
    if (!ready) return
    void db.preferences.put({ key: 'provider-preferences', value: { provider: config.provider, model: config.model, endpoint: config.endpoint }, updatedAt: new Date().toISOString() })
  }, [ready, config.provider, config.model, config.endpoint])

  const testConnection = async () => {
    setChecking(true); setConnectionStatus('')
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 20_000)
    try {
      const reply = await checkConnection(config, controller.signal)
      setConnectionStatus(`Connected. The model replied “${reply.slice(0, 60)}”.`)
    } catch (error) { setConnectionStatus(error instanceof Error ? error.message : 'The connection check failed.') }
    finally { window.clearTimeout(timeout); setChecking(false) }
  }

  const saveEncrypted = async () => {
    if (passphrase.length < 8) { setCredentialStatus('Use a passphrase with at least eight characters.'); return }
    if (!config.apiKey && !falKey) { setCredentialStatus('Add at least one key before saving.'); return }
    try {
      const bundle: SecretBundle = { provider: config.provider, model: config.model, customEndpoint: config.endpoint, keys: { ai: config.apiKey, fal: falKey } }
      const encrypted = await encryptBundle(bundle, passphrase)
      await db.preferences.put({ key: 'encrypted-provider-credentials', value: encrypted, updatedAt: new Date().toISOString() } as EncryptedCredentialRecord)
      setHasEncrypted(true); setRemember(true); setCredentialStatus('Encrypted credentials saved in this browser.'); setPassphrase('')
    } catch { setCredentialStatus('Credentials could not be encrypted in this browser.') }
  }

  const unlockEncrypted = async () => {
    if (!passphrase) { setCredentialStatus('Enter the passphrase used when the keys were saved.'); return }
    try {
      const record = await db.preferences.get('encrypted-provider-credentials') as EncryptedCredentialRecord | undefined
      if (!record) throw new Error('No encrypted keys are saved.')
      const bundle = await decryptBundle(record.value, passphrase)
      const provider = providers.includes(bundle.provider as ProviderId) ? bundle.provider as ProviderId : 'demo'
      replaceSecrets({ provider, apiKey: bundle.keys.ai ?? '', model: bundle.model ?? providerDetails[provider].defaultModel, endpoint: bundle.customEndpoint }, bundle.keys.fal ?? '')
      setRemember(true); setCredentialStatus('Credentials unlocked for this session.'); setPassphrase('')
    } catch { setCredentialStatus('That passphrase did not unlock the saved credentials.') }
  }

  const forgetEncrypted = async () => {
    await db.preferences.delete('encrypted-provider-credentials')
    setHasEncrypted(false); setRemember(false); clearSecrets(); setCredentialStatus('Saved credentials removed. Session keys cleared.')
  }

  const exportBackup = async () => {
    setBackupStatus('Preparing backup…')
    try {
      const blob = await createBackup(includeMedia)
      const day = new Date().toISOString().slice(0, 10)
      downloadBlob(blob, `better-learning-backup-${day}.zip`)
      setBackupStatus('Backup downloaded. Credentials were excluded.')
    } catch { setBackupStatus('The backup could not be created.') }
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setBackupStatus('Validating backup…')
    try {
      const manifest = await importBackup(file)
      setBackupStatus(`Imported ${manifest.counts.notes} notes, ${manifest.counts.progress} progress records, and ${manifest.counts.courses} custom courses.`)
    } catch (error) { setBackupStatus(error instanceof Error ? error.message : 'The backup is invalid.') }
    finally { event.target.value = '' }
  }

  return (
    <div className="page settings-page">
      <header className="page-heading settings-heading"><div><p className="eyebrow">Settings</p><h1>Your keys. Your library. Your device.</h1></div><div className="privacy-chip"><ShieldCheck size={16} /><span><strong>Local by design</strong><small>No Better Learning account</small></span></div></header>

      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections"><a href="#ai">AI connection</a><a href="#media">Voice & avatars</a><a href="#credentials">Credential storage</a><a href="#backup">Backup & restore</a><a href="#about">About</a></nav>
        <div className="settings-content">
          <section className="settings-section" id="ai"><div className="settings-section__heading"><span><KeyRound size={18} /></span><div><h2>AI connection</h2><p>Choose one provider for live office hours and generated debates.</p></div></div>
            <div className="provider-grid">{providers.map((provider) => <button key={provider} className={config.provider === provider ? 'is-selected' : ''} onClick={() => { setProvider(provider); setConnectionStatus('') }}><span>{providerDetails[provider].label}</span>{config.provider === provider && <Check size={15} />}</button>)}</div>
            <p className="provider-hint">{providerDetails[config.provider].hint}</p>
            {config.provider !== 'demo' && <div className="credential-fields"><div className="credential-field"><label htmlFor="provider-api-key">API key{config.provider === 'custom' ? ' (optional)' : ''}</label><div className="secret-input"><input id="provider-api-key" type={showAiKey ? 'text' : 'password'} value={config.apiKey} onChange={(event) => updateConfig({ apiKey: event.target.value })} placeholder={config.provider === 'custom' ? 'Leave blank if the endpoint needs no key' : 'Stored in memory for this session'} autoComplete="off" spellCheck={false} /><button type="button" onClick={() => setShowAiKey((value) => !value)} aria-label={showAiKey ? 'Hide API key' : 'Show API key'}>{showAiKey ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div><label>Model<input value={config.model} onChange={(event) => updateConfig({ model: event.target.value })} /></label>{config.provider === 'custom' && <label className="wide-field">Base endpoint<input type="url" value={config.endpoint ?? ''} onChange={(event) => updateConfig({ endpoint: event.target.value })} placeholder="http://localhost:11434/v1" /></label>}</div>}
            {config.provider !== 'demo' && <div className="connection-row"><button className="secondary-button" onClick={() => void testConnection()} disabled={checking || (config.provider !== 'custom' && !config.apiKey)}>{checking ? <LoaderCircle className="spin" size={15} /> : <Wifi size={15} />} Check connection</button><span>A tiny request is sent and may use provider credits.</span></div>}
            {connectionStatus && <p className="form-status" role="status">{connectionStatus}</p>}
            <div className="browser-notice"><Database size={16} /><p>Some providers or local endpoints block requests from a hosted page. If that happens, run Better Learning locally and allow this origin in the endpoint’s CORS settings.</p></div>
          </section>

          <section className="settings-section" id="media"><div className="settings-section__heading"><span><Volume2 size={18} /></span><div><h2>Voice & avatars</h2><p>Connect fal.ai for Kokoro narration, Kling avatar clips, and Whisper caption timing.</p></div></div>
            <div className="standalone-label"><label htmlFor="fal-api-key">fal.ai key</label><div className="secret-input"><input id="fal-api-key" type={showFalKey ? 'text' : 'password'} value={falKey} onChange={(event) => setFalKey(event.target.value)} placeholder="Stored in memory for this session" autoComplete="off" spellCheck={false} /><button type="button" onClick={() => setShowFalKey((value) => !value)} aria-label={showFalKey ? 'Hide fal.ai key' : 'Show fal.ai key'}>{showFalKey ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
            <div className="media-models"><div><strong>Kokoro</strong><span>American English · synthetic voice</span><a href="https://fal.ai/models/fal-ai/kokoro/american-english/api" target="_blank" rel="noreferrer">API & pricing <ExternalLink size={12} /></a></div><div><strong>Kling</strong><span>Talking avatar · short scenes</span><a href="https://fal.ai/models/fal-ai/kling-video/v1/standard/ai-avatar/api" target="_blank" rel="noreferrer">API & pricing <ExternalLink size={12} /></a></div><div><strong>Whisper</strong><span>Timestamped captions</span><a href="https://fal.ai/models/fal-ai/whisper/api" target="_blank" rel="noreferrer">API & pricing <ExternalLink size={12} /></a></div></div>
            <p className="media-warning">Every media request shows the complete script and generation scope before submission. Failed jobs are not automatically resubmitted.</p>
          </section>

          <section className="settings-section" id="credentials"><div className="settings-section__heading"><span><LockKeyhole size={18} /></span><div><h2>Credential storage</h2><p>Keys stay in memory by default and disappear when this tab session ends.</p></div></div>
            <label className="switch-row"><span><strong>Remember encrypted keys</strong><small>Save an AES-GCM encrypted bundle in IndexedDB.</small></span><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /></label>
            {(remember || hasEncrypted) && <div className="unlock-row"><label>Passphrase<input type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} placeholder={hasEncrypted ? 'Unlock or replace saved keys' : 'At least 8 characters'} autoComplete="new-password" /></label><div>{hasEncrypted && <button className="ghost-button" onClick={() => void unlockEncrypted()}><LockKeyhole size={14} /> Unlock</button>}<button className="dark-button" onClick={() => void saveEncrypted()}><ShieldCheck size={14} /> {hasEncrypted ? 'Replace encrypted copy' : 'Save encrypted'}</button></div></div>}
            {hasEncrypted && <button className="text-danger" onClick={() => void forgetEncrypted()}><Trash2 size={13} /> Remove encrypted credentials</button>}
            {credentialStatus && <p className="form-status" role="status">{credentialStatus}</p>}
          </section>

          <section className="settings-section" id="backup"><div className="settings-section__heading"><span><Archive size={18} /></span><div><h2>Backup & restore</h2><p>Move courses, sources, notes, progress, and conversations between browsers.</p></div></div>
            <div className="backup-actions"><div><label className="switch-row"><span><strong>Include downloaded media</strong><small>Add locally cached audio and video files. Credentials are always excluded.</small></span><input type="checkbox" checked={includeMedia} onChange={(event) => setIncludeMedia(event.target.checked)} /></label><button className="dark-button" onClick={() => void exportBackup()}><Download size={15} /> Export ZIP backup</button></div><div><input ref={importInput} type="file" accept=".zip,application/zip" onChange={handleImport} hidden /><p>Imports are fully validated before any existing record changes.</p><button className="ghost-button" onClick={() => importInput.current?.click()}><Upload size={15} /> Import backup</button></div></div>
            {backupStatus && <p className="form-status" role="status">{backupStatus}</p>}
          </section>

          <section className="settings-section about-section" id="about"><div className="settings-section__heading"><span>bl</span><div><h2>Better Learning</h2><p>Open-source, local-first learning from primary sources.</p></div></div><div className="about-links"><a href="https://github.com/ReservedSnow673/Better-Learning" target="_blank" rel="noreferrer">Source code <ExternalLink size={13} /></a><Link to="/">Starter course library <ArrowRight size={13} /></Link></div><p>Starter texts: Project Gutenberg eBooks 2680, 5000, and 132. Portraits are original AI-generated interpretations. Version 0.1.0 · MIT License.</p></section>
        </div>
      </div>
    </div>
  )
}
