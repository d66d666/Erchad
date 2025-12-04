import { useState } from 'react';
import { Key, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import { generateLicenseKey } from '../lib/licenseKey';

interface GeneratedKey {
  licenseKey: string;
  schoolId: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
}

export default function DeveloperAdminPage() {
  const [schoolId, setSchoolId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generatedKeys, setGeneratedKeys] = useState<GeneratedKey[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleGenerate = () => {
    setError('');

    if (!schoolId.trim()) {
      setError('الرجاء إدخال معرف المدرسة');
      return;
    }

    if (!startDate) {
      setError('الرجاء اختيار تاريخ البداية');
      return;
    }

    if (!endDate) {
      setError('الرجاء اختيار تاريخ الانتهاء');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      setError('تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية');
      return;
    }

    const licenseKey = generateLicenseKey(schoolId, startDate, endDate);

    const newKey: GeneratedKey = {
      licenseKey,
      schoolId,
      startDate,
      endDate,
      generatedAt: new Date().toISOString()
    };

    setGeneratedKeys([newKey, ...generatedKeys]);
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.floor(diffDays / 30);
    const days = diffDays % 30;

    if (months > 0 && days > 0) {
      return `${months} شهر و ${days} يوم`;
    } else if (months > 0) {
      return `${months} شهر`;
    } else {
      return `${days} يوم`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
              <Key className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">لوحة المطور</h1>
              <p className="text-gray-500">إنشاء رموز تفعيل للمدارس</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                معرف المدرسة (School ID)
              </label>
              <input
                type="text"
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                placeholder="مثال: SCHOOL_2024_001"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <p className="text-xs text-gray-500 mt-1">معرف فريد لكل مدرسة</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                تاريخ بداية الاشتراك
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                تاريخ انتهاء الاشتراك
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleGenerate}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              >
                🔑 إنشاء رمز التفعيل
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 mb-6">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {generatedKeys.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              الرموز المُنشأة ({generatedKeys.length})
            </h2>

            <div className="space-y-4">
              {generatedKeys.map((item, index) => (
                <div
                  key={index}
                  className="border-2 border-gray-200 rounded-xl p-6 hover:border-indigo-300 transition-all bg-gradient-to-br from-white to-slate-50"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm font-semibold text-gray-500">رمز التفعيل:</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <code className="flex-1 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 text-indigo-900 px-4 py-3 rounded-lg font-mono text-lg font-bold tracking-wider">
                          {item.licenseKey}
                        </code>
                        <button
                          onClick={() => copyToClipboard(item.licenseKey)}
                          className="p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
                          title="نسخ"
                        >
                          {copiedKey === item.licenseKey ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <Copy className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <span className="text-gray-500 block mb-1">معرف المدرسة:</span>
                      <span className="font-semibold text-gray-800">{item.schoolId}</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <span className="text-gray-500 block mb-1">تاريخ البداية:</span>
                      <span className="font-semibold text-gray-800">{formatDate(item.startDate)}</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <span className="text-gray-500 block mb-1">تاريخ الانتهاء:</span>
                      <span className="font-semibold text-gray-800">{formatDate(item.endDate)}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
                        المدة: {getDuration(item.startDate, item.endDate)}
                      </span>
                    </div>
                    <div className="text-gray-500">
                      تم الإنشاء: {new Date(item.generatedAt).toLocaleString('ar-SA')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
