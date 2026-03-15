import { useState, useEffect } from 'react';
import type { Thread, ModelInfo } from '../../types';
import { api } from '../../api/client';
import './SettingsPanel.css';

interface SettingsPanelProps {
  thread: Thread | null;
  onThreadUpdate: (thread: Thread) => void;
  onClose: () => void;
}

export default function SettingsPanel({ thread, onThreadUpdate, onClose }: SettingsPanelProps) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [loadingModel, setLoadingModel] = useState(false);
  const [loadModelStatus, setLoadModelStatus] = useState<string | null>(null);
  const [azureConfigured, setAzureConfigured] = useState(false);
  const [saving, setSaving] = useState(false);

  // Local form state
  const [selectedProvider, setSelectedProvider] = useState(thread?.provider || 'lmstudio');
  const [selectedModel, setSelectedModel] = useState(thread?.model || '');
  const [systemPrompt, setSystemPrompt] = useState(thread?.system_prompt || '');
  const [temperature, setTemperature] = useState(thread?.temperature ?? 0.7);

  // Update local state when thread changes
  useEffect(() => {
    if (!thread) return;
    setSelectedProvider(thread.provider);
    setSelectedModel(thread.model || '');
    setSystemPrompt(thread.system_prompt || '');
    setTemperature(thread.temperature);
  }, [thread?.id]);

  // Load provider status
  useEffect(() => {
    api.providers.status().then((status) => {
      setAzureConfigured(status.azure.configured);
    }).catch(() => {});
  }, []);

  // Auto-load models when provider changes to lmstudio
  useEffect(() => {
    if (selectedProvider === 'lmstudio') {
      loadModels();
    } else if (selectedProvider === 'azure') {
      loadAzureModels();
    }
  }, [selectedProvider]);

  async function loadModels() {
    setModelsLoading(true);
    setModelsError(null);
    try {
      const result = await api.providers.models('lmstudio');
      setModels(result.models);
      if (result.error) setModelsError(result.error);
    } catch (err: unknown) {
      setModelsError(err instanceof Error ? err.message : 'Failed to load models');
    } finally {
      setModelsLoading(false);
    }
  }

  async function loadAzureModels() {
    setModelsLoading(true);
    setModelsError(null);
    try {
      const result = await api.providers.models('azure');
      setModels(result.models);
      if (result.error) setModelsError(result.error);
    } catch (err: unknown) {
      setModelsError(err instanceof Error ? err.message : 'Failed to load Azure models');
    } finally {
      setModelsLoading(false);
    }
  }

  async function handleLoadModel() {
    if (!selectedModel) return;
    setLoadingModel(true);
    setLoadModelStatus(null);
    try {
      const result = await api.providers.loadModel(selectedProvider, selectedModel);
      setLoadModelStatus(result.error ? result.error : '✓ Model loaded successfully');
    } catch (err: unknown) {
      setLoadModelStatus(err instanceof Error ? err.message : 'Failed to load model');
    } finally {
      setLoadingModel(false);
    }
  }

  async function handleSave() {
    if (!thread) return;
    setSaving(true);
    try {
      const updated = await api.threads.update(thread.id, {
        provider: selectedProvider,
        model: selectedModel || null,
        system_prompt: systemPrompt || null,
        temperature,
      });
      onThreadUpdate(updated);
    } catch (err: unknown) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-panel">
      <div className="settings-panel__header">
        <h2 className="settings-panel__title">Settings</h2>
        <button className="settings-panel__close" onClick={onClose} aria-label="Close settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {!thread ? (
        <div className="settings-panel__no-thread">
          <p>Select a conversation to configure its settings.</p>
        </div>
      ) : (
        <div className="settings-panel__body">
          {/* Provider */}
          <div className="settings-section">
            <div className="settings-section__label">Provider</div>
            <div className="settings-section__provider-toggle">
              <button
                className={`settings-provider-btn${selectedProvider === 'lmstudio' ? ' settings-provider-btn--active' : ''}`}
                onClick={() => setSelectedProvider('lmstudio')}
              >
                LM Studio
              </button>
              <button
                className={`settings-provider-btn${selectedProvider === 'azure' ? ' settings-provider-btn--active' : ''}`}
                onClick={() => setSelectedProvider('azure')}
              >
                Azure OpenAI
              </button>
            </div>
          </div>

          {/* Azure status */}
          {selectedProvider === 'azure' && (
            <div className={`settings-status ${azureConfigured ? 'settings-status--ok' : 'settings-status--warn'}`}>
              {azureConfigured ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Azure OpenAI is configured
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Azure not configured — set env vars
                </>
              )}
            </div>
          )}

          {/* Model selection */}
          <div className="settings-section">
            <div className="settings-section__label-row">
              <div className="settings-section__label">Model</div>
              {selectedProvider === 'lmstudio' && (
                <button
                  className="settings-refresh-btn"
                  onClick={loadModels}
                  disabled={modelsLoading}
                  title="Refresh model list"
                >
                  <svg
                    width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    style={{ animation: modelsLoading ? 'spin 0.8s linear infinite' : 'none' }}
                  >
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  Refresh
                </button>
              )}
            </div>

            {modelsLoading ? (
              <div className="settings-models-loading">
                <div className="spinner-sm" />
                <span>Loading models…</span>
              </div>
            ) : modelsError ? (
              <div className="settings-models-error">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {modelsError}
              </div>
            ) : models.length > 0 ? (
              <select
                className="settings-select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                <option value="">— Select a model —</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            ) : (
              <div className="settings-models-empty">No models found</div>
            )}

            {selectedProvider === 'lmstudio' && selectedModel && (
              <div className="settings-load-model">
                <button
                  className="settings-load-btn"
                  onClick={handleLoadModel}
                  disabled={loadingModel}
                >
                  {loadingModel ? (
                    <>
                      <div className="spinner-sm" />
                      Loading…
                    </>
                  ) : 'Load Model'}
                </button>
                {loadModelStatus && (
                  <span className={`settings-load-status ${loadModelStatus.startsWith('✓') ? 'settings-load-status--ok' : 'settings-load-status--error'}`}>
                    {loadModelStatus}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* System prompt */}
          <div className="settings-section">
            <div className="settings-section__label">System prompt <span className="settings-optional">optional</span></div>
            <textarea
              className="settings-textarea"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are a helpful assistant..."
              rows={3}
            />
          </div>

          {/* Temperature */}
          <div className="settings-section">
            <div className="settings-section__label-row">
              <div className="settings-section__label">Temperature</div>
              <span className="settings-value-display">{temperature.toFixed(1)}</span>
            </div>
            <input
              type="range"
              className="settings-range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
            />
            <div className="settings-range-labels">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>

          <button
            className="settings-save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Apply to conversation'}
          </button>
        </div>
      )}
    </div>
  );
}
