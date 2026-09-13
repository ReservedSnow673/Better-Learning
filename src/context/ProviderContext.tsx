import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { providerDetails, type ProviderConfig, type ProviderId } from '../lib/providers'

interface ProviderContextValue {
  config: ProviderConfig
  falKey: string
  setProvider: (provider: ProviderId) => void
  updateConfig: (patch: Partial<ProviderConfig>) => void
  setFalKey: (value: string) => void
  replaceSecrets: (config: ProviderConfig, falKey?: string) => void
  clearSecrets: () => void
}

const ProviderContext = createContext<ProviderContextValue | null>(null)

export function ProviderProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ProviderConfig>({ provider: 'demo', apiKey: '', model: providerDetails.demo.defaultModel })
  const [falKey, setFalKey] = useState('')

  const setProvider = useCallback((provider: ProviderId) => {
    setConfig((current) => ({ ...current, provider, model: providerDetails[provider].defaultModel, apiKey: provider === current.provider ? current.apiKey : '' }))
  }, [])
  const updateConfig = useCallback((patch: Partial<ProviderConfig>) => { setConfig((current) => ({ ...current, ...patch })) }, [])
  const replaceSecrets = useCallback((nextConfig: ProviderConfig, nextFalKey = '') => { setConfig(nextConfig); setFalKey(nextFalKey) }, [])
  const clearSecrets = useCallback(() => { setConfig((current) => ({ ...current, apiKey: '' })); setFalKey('') }, [])

  const value = useMemo<ProviderContextValue>(() => ({
    config,
    falKey,
    setProvider,
    updateConfig,
    setFalKey,
    replaceSecrets,
    clearSecrets,
  }), [clearSecrets, config, falKey, replaceSecrets, setProvider, updateConfig])

  return <ProviderContext.Provider value={value}>{children}</ProviderContext.Provider>
}

export function useProvider() {
  const context = useContext(ProviderContext)
  if (!context) throw new Error('useProvider must be used within ProviderProvider')
  return context
}
