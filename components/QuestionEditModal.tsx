import React, { useState } from 'react';
import { Question } from '../types';
import { translations } from '../i18n';

interface QuestionEditModalProps {
  question: Question;
  onUpdate: (questionId: string, updates: Partial<Pick<Question, 'description' | 'react' | 'vue'>>) => void;
  onClose: () => void;
  lang: 'en' | 'zh';
}

const QuestionEditModal: React.FC<QuestionEditModalProps> = ({
  question,
  onUpdate,
  onClose,
  lang
}) => {
  const t = translations[lang];
  const [description, setDescription] = useState(question.description);
  const [reactCode, setReactCode] = useState(question.react.initial);
  const [vueCode, setVueCode] = useState(question.vue.initial);
  const [activeTab, setActiveTab] = useState<'description' | 'react' | 'vue'>('description');

  const handleSave = () => {
    const updates: Partial<Pick<Question, 'description' | 'react' | 'vue'>> = {};
    
    if (description !== question.description) {
      updates.description = description;
    }
    
    if (reactCode !== question.react.initial) {
      updates.react = {
        ...question.react,
        initial: reactCode
      };
    }
    
    if (vueCode !== question.vue.initial) {
      updates.vue = {
        ...question.vue,
        initial: vueCode
      };
    }
    
    if (Object.keys(updates).length > 0) {
      onUpdate(question.id, updates);
    }
    
    onClose();
  };

  const handleReset = () => {
    setDescription(question.originalDescription || question.description);
    setReactCode(question.originalReact?.initial || question.react.initial);
    setVueCode(question.originalVue?.initial || question.vue.initial);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t.editQuestion}</h2>
              <p className="text-gray-600 mt-1">{question.title}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {[
            { key: 'description', label: t.description },
            { key: 'react', label: 'React' },
            { key: 'vue', label: 'Vue' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-6 py-3 font-medium transition ${
                activeTab === tab.key
                  ? 'text-pink-600 border-b-2 border-pink-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'description' && (
            <div className="space-y-4">
              {question.originalDescription && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.originalDescription}
                  </label>
                  <p className="text-gray-600 whitespace-pre-wrap">{question.originalDescription}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.description}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder={t.descriptionPlaceholder}
                />
              </div>
            </div>
          )}

          {activeTab === 'react' && (
            <div className="space-y-4">
              {question.originalReact && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.originalCode}
                  </label>
                  <pre className="text-sm text-gray-600 whitespace-pre-wrap bg-white p-3 rounded border">{question.originalReact.initial}</pre>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  React Code
                </label>
                <textarea
                  value={reactCode}
                  onChange={(e) => setReactCode(e.target.value)}
                  className="w-full h-64 p-3 border border-gray-300 rounded-lg resize-vertical focus:ring-2 focus:ring-pink-500 focus:border-transparent font-mono text-sm"
                  placeholder={t.codePlaceholder}
                />
              </div>
            </div>
          )}

          {activeTab === 'vue' && (
            <div className="space-y-4">
              {question.originalVue && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.originalCode}
                  </label>
                  <pre className="text-sm text-gray-600 whitespace-pre-wrap bg-white p-3 rounded border">{question.originalVue.initial}</pre>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vue Code
                </label>
                <textarea
                  value={vueCode}
                  onChange={(e) => setVueCode(e.target.value)}
                  className="w-full h-64 p-3 border border-gray-300 rounded-lg resize-vertical focus:ring-2 focus:ring-pink-500 focus:border-transparent font-mono text-sm"
                  placeholder={t.codePlaceholder}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-between">
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              {t.reset}
            </button>
            {question.originalDescription || question.originalReact || question.originalVue ? (
              <button
                onClick={() => {
                  setDescription(question.originalDescription || question.description);
                  setReactCode(question.originalReact?.initial || question.react.initial);
                  setVueCode(question.originalVue?.initial || question.vue.initial);
                  onUpdate(question.id, {
                    description: question.originalDescription || question.description,
                    react: question.originalReact || question.react,
                    vue: question.originalVue || question.vue
                  });
                  onClose();
                }}
                className="px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition"
              >
                {t.restoreOriginal}
              </button>
            ) : null}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
            >
              {t.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionEditModal;