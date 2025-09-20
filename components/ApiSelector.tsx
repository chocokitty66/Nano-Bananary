import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/context';

export interface ApiConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  type: 'official' | 'custom' | 'proxy';
  description: string;
}

const DEFAULT_APIS: ApiConfig[] = [
  {
    id: 'official',
    name: '🌟 Google 官方',
    baseUrl: 'https://generativelanguage.googleapis.com',
    apiKey: '',
    type: 'official',
    description: '官方 Google Gemini API - 稳定可靠'
  },
  {
    id: 'custom-proxy',
    name: '🚀 推荐代理',
    baseUrl: 'https://yqdkzwnuarth.eu-central-1.clawcloudrun.com',
    apiKey: 'sk-chocokitty',
    type: 'proxy',
    description: '高速代理服务 - 开箱即用'
  },
  {
    id: 'custom',
    name: '⚙️ 自定义配置',
    baseUrl: '',
    apiKey: '',
    type: 'custom',
    description: '完全自定义 - 支持任何兼容 API'
  }
];

interface ApiSelectorProps {
  onApiChange?: (config: ApiConfig) => void;
}

const ApiSelector: React.FC<ApiSelectorProps> = ({ onApiChange }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedApi, setSelectedApi] = useState<ApiConfig>(() => {
    try {
      const saved = localStorage.getItem('selectedApi');
      return saved ? JSON.parse(saved) : DEFAULT_APIS[1]; // 默认使用自定义代理
    } catch {
      return DEFAULT_APIS[1];
    }
  });
  const [customConfig, setCustomConfig] = useState<ApiConfig>({
    id: 'custom',
    name: '⚙️ 自定义配置',
    baseUrl: '',
    apiKey: '',
    type: 'custom',
    description: '完全自定义 - 支持任何兼容 API'
  });
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');

  useEffect(() => {
    localStorage.setItem('selectedApi', JSON.stringify(selectedApi));
    onApiChange?.(selectedApi);
  }, [selectedApi, onApiChange]);

  const handleApiSelect = (api: ApiConfig) => {
    if (api.id === 'custom') {
      setSelectedApi(customConfig);
    } else if (api.id === 'official' && !api.apiKey) {
      // 如果选择官方API但没有密钥，显示输入框
      setShowApiKeyInput(true);
      setTempApiKey('');
    } else {
      setSelectedApi(api);
    }
    setIsOpen(false);
  };

  const handleCustomConfigChange = (field: keyof ApiConfig, value: string) => {
    const newConfig = { ...customConfig, [field]: value };
    setCustomConfig(newConfig);
    if (selectedApi.id === 'custom') {
      setSelectedApi(newConfig);
    }
  };

  const handleApiKeySubmit = () => {
    if (tempApiKey.trim()) {
      const updatedApi = { ...DEFAULT_APIS[0], apiKey: tempApiKey.trim() };
      setSelectedApi(updatedApi);
      setShowApiKeyInput(false);
      setTempApiKey('');
    }
  };

  const handleQuickApiKeyChange = (apiId: string, newApiKey: string) => {
    if (selectedApi.id === apiId) {
      const updatedApi = { ...selectedApi, apiKey: newApiKey };
      setSelectedApi(updatedApi);
    }
  };

  const getStatusColor = (api: ApiConfig) => {
    if (api.id === selectedApi.id) return 'text-green-500';
    if (api.type === 'official' && !api.apiKey) return 'text-yellow-500';
    return 'text-blue-400';
  };

  const getStatusIcon = (api: ApiConfig) => {
    if (api.id === selectedApi.id) return '✨';
    if (api.type === 'official' && !api.apiKey) return '🔑';
    return '💫';
  };

  return (
    <>
      <div className="relative" style={{zIndex: 9998}}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="anime-api-selector flex items-center space-x-3 px-4 py-3 transition-all duration-300 hover:scale-105"
          title="API 配置"
        >
          <span className="anime-icon text-lg">🎯</span>
          <div className="flex flex-col items-start">
            <span className="text-sm font-bold text-blue-600">API 服务</span>
            <span className="text-xs text-blue-400">{selectedApi.name}</span>
          </div>
          <svg
            className={`w-5 h-5 transition-transform duration-300 text-blue-500 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-3 w-[420px] anime-card p-6" style={{zIndex: 9999}}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="anime-title text-xl font-bold">🎮 API 服务配置</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="anime-icon text-gray-400 hover:text-red-400 text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {DEFAULT_APIS.map((api) => (
                <div key={api.id} className="anime-card p-4 border-2 border-blue-200 hover:border-blue-400">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="anime-icon text-xl">{getStatusIcon(api)}</span>
                      <div>
                        <span className="font-bold text-gray-800">{api.name}</span>
                        <span className={`ml-2 text-xs ${getStatusColor(api)}`}>
                          {api.id === selectedApi.id ? '当前使用' : ''}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleApiSelect(api)}
                      className="anime-button px-4 py-2 text-sm"
                    >
                      {api.id === selectedApi.id ? '✨ 使用中' : '🚀 选择'}
                    </button>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{api.description}</p>
                  
                  {api.id === 'custom' ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="🌐 API 基础 URL (例: https://api.example.com)"
                        value={customConfig.baseUrl}
                        onChange={(e) => handleCustomConfigChange('baseUrl', e.target.value)}
                        className="anime-input w-full"
                      />
                      <input
                        type="password"
                        placeholder="🔑 API 密钥"
                        value={customConfig.apiKey}
                        onChange={(e) => handleCustomConfigChange('apiKey', e.target.value)}
                        className="anime-input w-full"
                      />
                      <input
                        type="text"
                        placeholder="📝 服务名称 (可选)"
                        value={customConfig.name}
                        onChange={(e) => handleCustomConfigChange('name', e.target.value)}
                        className="anime-input w-full"
                      />
                    </div>
                  ) : api.id === 'official' ? (
                    <div className="space-y-2">
                      <div className="text-xs text-gray-500 font-mono bg-gray-100 p-2 rounded">
                        🌐 {api.baseUrl}
                      </div>
                      {selectedApi.id === 'official' && (
                        <input
                          type="password"
                          placeholder="🔑 输入你的 Google API 密钥"
                          value={selectedApi.apiKey}
                          onChange={(e) => handleQuickApiKeyChange('official', e.target.value)}
                          className="anime-input w-full"
                        />
                      )}
                      {api.type === 'official' && !selectedApi.apiKey && selectedApi.id === 'official' && (
                        <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                          ⚠️ 需要配置 API 密钥才能使用
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-xs text-gray-500 font-mono bg-gray-100 p-2 rounded">
                        🌐 {api.baseUrl}
                      </div>
                      <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                        ✅ 已配置完成，可直接使用
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-blue-200">
              <div className="text-xs text-gray-500 space-y-2">
                <p className="flex items-center"><span className="anime-icon mr-2">💡</span>使用提示：</p>
                <ul className="list-none space-y-1 ml-6">
                  <li>🌟 官方 API 需要 Google API 密钥</li>
                  <li>🚀 推荐代理服务开箱即用，无需配置</li>
                  <li>⚙️ 自定义配置支持任何兼容的 Gemini API</li>
                  <li>🔒 所有配置都保存在本地，确保隐私安全</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* API Key 输入弹窗 */}
      {showApiKeyInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{zIndex: 10000}}>
          <div className="anime-card p-8 max-w-md w-full mx-4">
            <h3 className="anime-title text-xl font-bold mb-4">🔑 输入 API 密钥</h3>
            <p className="text-sm text-gray-600 mb-4">
              请输入你的 Google Gemini API 密钥以使用官方服务
            </p>
            <input
              type="password"
              placeholder="sk-..."
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              className="anime-input w-full mb-4"
              autoFocus
            />
            <div className="flex space-x-3">
              <button
                onClick={handleApiKeySubmit}
                disabled={!tempApiKey.trim()}
                className="anime-button flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✨ 确认
              </button>
              <button
                onClick={() => setShowApiKeyInput(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ApiSelector;