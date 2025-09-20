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
    name: 'Google Official',
    baseUrl: 'https://generativelanguage.googleapis.com',
    apiKey: '',
    type: 'official',
    description: '官方 Google Gemini API'
  },
  {
    id: 'custom-proxy',
    name: 'Custom Proxy',
    baseUrl: 'https://yqdkzwnuarth.eu-central-1.clawcloudrun.com',
    apiKey: 'sk-chocokitty',
    type: 'proxy',
    description: '自定义代理服务'
  },
  {
    id: 'custom',
    name: 'Custom API',
    baseUrl: '',
    apiKey: '',
    type: 'custom',
    description: '自定义 API 配置'
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
    name: 'Custom API',
    baseUrl: '',
    apiKey: '',
    type: 'custom',
    description: '自定义 API 配置'
  });

  useEffect(() => {
    localStorage.setItem('selectedApi', JSON.stringify(selectedApi));
    onApiChange?.(selectedApi);
  }, [selectedApi, onApiChange]);

  const handleApiSelect = (api: ApiConfig) => {
    if (api.id === 'custom') {
      setSelectedApi(customConfig);
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

  const getStatusColor = (api: ApiConfig) => {
    if (api.id === selectedApi.id) return 'text-green-500';
    if (api.type === 'official' && !api.apiKey) return 'text-yellow-500';
    return 'text-gray-400';
  };

  const getStatusIcon = (api: ApiConfig) => {
    if (api.id === selectedApi.id) return '✅';
    if (api.type === 'official' && !api.apiKey) return '⚠️';
    return '🔧';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        title="API 配置"
      >
        <span className="text-sm">🔧</span>
        <span className="text-sm font-medium">API</span>
        <span className="text-xs text-gray-500">{selectedApi.name}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">API 服务配置</h3>
            
            <div className="space-y-3">
              {DEFAULT_APIS.map((api) => (
                <div key={api.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span>{getStatusIcon(api)}</span>
                      <span className="font-medium">{api.name}</span>
                      <span className={`text-xs ${getStatusColor(api)}`}>
                        {api.id === selectedApi.id ? '当前使用' : ''}
                      </span>
                    </div>
                    <button
                      onClick={() => handleApiSelect(api)}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      选择
                    </button>
                  </div>
                  
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{api.description}</p>
                  
                  {api.id === 'custom' ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="API 基础 URL"
                        value={customConfig.baseUrl}
                        onChange={(e) => handleCustomConfigChange('baseUrl', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                      />
                      <input
                        type="text"
                        placeholder="API 密钥"
                        value={customConfig.apiKey}
                        onChange={(e) => handleCustomConfigChange('apiKey', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                      />
                      <input
                        type="text"
                        placeholder="服务名称"
                        value={customConfig.name}
                        onChange={(e) => handleCustomConfigChange('name', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">
                        <span className="font-mono">{api.baseUrl}</span>
                      </div>
                      {api.type === 'official' && (
                        <div className="text-xs text-yellow-600 dark:text-yellow-400">
                          ⚠️ 需要配置 API 密钥
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
              <div className="text-xs text-gray-500">
                <p>💡 提示：</p>
                <ul className="list-disc list-inside space-y-1 mt-1">
                  <li>官方 API 需要 Google API 密钥</li>
                  <li>代理服务可能有使用限制</li>
                  <li>自定义配置支持任何兼容的 API</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiSelector;