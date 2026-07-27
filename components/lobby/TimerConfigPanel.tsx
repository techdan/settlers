'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TimerConfig, TIMER_PRESETS } from '@/lib/types/timer';

interface TimerConfigPanelProps {
  config: TimerConfig;
  isHost: boolean;
  onChange: (config: TimerConfig) => void;
}

export function TimerConfigPanel({ config, isHost, onChange }: TimerConfigPanelProps) {
  const configKey = [
    config.enabled,
    config.turnTimeLimit,
    config.timeBank,
    config.extensionIncrement,
    config.maxExtensionsPerTurn,
    config.maxExtraSecondsPerTurn,
  ].join(':');

  return (
    <TimerConfigForm
      key={configKey}
      config={config}
      isHost={isHost}
      onChange={onChange}
    />
  );
}

function TimerConfigForm({ config, isHost, onChange }: TimerConfigPanelProps) {
  const [enabled, setEnabled] = useState(config.enabled);
  const [selectedPreset, setSelectedPreset] = useState<number>(() => {
    const preset = TIMER_PRESETS.find(p => p.value === config.turnTimeLimit);
    return preset ? preset.value : -1;
  });
  const [customTime, setCustomTime] = useState(config.turnTimeLimit);
  const [timeBank, setTimeBank] = useState(config.timeBank);

  // Debounce timer for slider changes
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Debounced onChange for sliders (500ms delay)
  const debouncedOnChange = useCallback((newConfig: TimerConfig) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      onChange(newConfig);
    }, 500);
  }, [onChange]);

  const handleEnabledChange = (newEnabled: boolean) => {
    setEnabled(newEnabled);
    onChange({ ...config, enabled: newEnabled }); // Immediate for toggle
  };

  const handlePresetChange = (value: number) => {
    setSelectedPreset(value);
    if (value !== -1) {
      // Preset selected
      setCustomTime(value);
      onChange({ ...config, turnTimeLimit: value }); // Immediate for button clicks
    }
  };

  const handleCustomTimeChange = (value: number) => {
    const clampedValue = Math.max(30, Math.min(600, value));
    setCustomTime(clampedValue);
    setSelectedPreset(-1); // Switch to custom
    debouncedOnChange({ ...config, turnTimeLimit: clampedValue }); // Debounced for slider
  };

  const handleTimeBankChange = (value: number) => {
    const clampedValue = Math.max(0, Math.min(900, value));
    setTimeBank(clampedValue);
    debouncedOnChange({ ...config, timeBank: clampedValue }); // Debounced for slider
  };

  const formatTime = (seconds: number): string => {
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
    }
    return `${seconds}s`;
  };

  if (!isHost) {
    // Read-only view for non-host players
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Turn Timer
          </label>
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            enabled
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            {enabled ? 'Enabled' : 'Disabled'}
          </div>
        </div>

        {enabled && (
          <div className="px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Turn Time Limit:</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{formatTime(config.turnTimeLimit)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Time Bank per Player:</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{formatTime(config.timeBank)}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Host view - editable
  return (
    <div className="space-y-3">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Turn Timer
        </label>
        <button
          onClick={() => handleEnabledChange(!enabled)}
          className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            enabled ? 'bg-green-600' : 'bg-slate-300 dark:bg-slate-700'
          }`}
          role="switch"
          aria-checked={enabled}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="space-y-4 animate-fadeIn">
          {/* Turn Time Presets */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Turn Time Limit
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TIMER_PRESETS.map((preset) => {
                if (preset.value === -1) {
                  // Custom option
                  return (
                    <button
                      key="custom"
                      onClick={() => setSelectedPreset(-1)}
                      className={`cursor-pointer px-3 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
                        selectedPreset === -1
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-400'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                }
                return (
                  <button
                    key={preset.value}
                    onClick={() => handlePresetChange(preset.value)}
                    className={`cursor-pointer px-3 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
                      selectedPreset === preset.value
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-400'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Custom Time Slider */}
            {selectedPreset === -1 && (
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Custom Time:</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatTime(customTime)}</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="600"
                  step="30"
                  value={customTime}
                  onChange={(e) => handleCustomTimeChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>30s</span>
                  <span>10m</span>
                </div>
              </div>
            )}
          </div>

          {/* Time Bank */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Time Bank per Player
              </label>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatTime(timeBank)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="900"
              step="30"
              value={timeBank}
              onChange={(e) => handleTimeBankChange(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>0m</span>
              <span>15m</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Extra time each player can borrow during the game
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
