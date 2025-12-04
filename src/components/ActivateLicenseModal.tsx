import { useState } from 'react';
import { X, Key, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { validateLicenseKey, formatSubscriptionDate } from '../lib/licenseKey';
import { db } from '../lib/db';

interface ActivateLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  onSuccess: () => void;
}

export default function ActivateLicenseModal({
  isOpen,
  onClose,
  schoolId,
  onSuccess
}: ActivateLicenseModalProps) {
  const [licenseKey, setLicenseKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleActivate = async () => {
    setError('');
    setSuccess(false);

    if (!licenseKey.trim()) {
      setError('الرجاء إدخال رمز التفعيل');
      return;
    }

    setIsLoading(true);

    try {
      const validation = validateLicenseKey(licenseKey, schoolId);

      if (!validation.isValid) {
        setError(validation.errorMessage || 'رمز التفعيل غير صحيح');
        setIsLoading(false);
        return;
      }

      const existingKey = await db.activation_history
        .where('key_id')
        .equals(validation.keyId)
        .first();

      if (existingKey) {
        setError('هذا الرمز تم استخدامه من قبل');
        setIsLoading(false);
        return;
      }

      const existingSubscription = await db.subscription.where('school_id').equals(schoolId).first();

      if (existingSubscription) {
        await db.subscription.update(existingSubscription.id!, {
          start_date: validation.startDate,
          end_date: validation.endDate,
          is_active: true,
          last_key_used: licenseKey,
          updated_at: new Date().toISOString()
        });
      } else {
        await db.subscription.add({
          id: crypto.randomUUID(),
          school_id: schoolId,
          start_date: validation.startDate,
          end_date: validation.endDate,
          is_active: true,
          last_key_used: licenseKey,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      await db.activation_history.add({
        id: crypto.randomUUID(),
        license_key: licenseKey,
        key_id: validation.keyId,
        activation_date: new Date().toISOString(),
        start_date: validation.startDate,
        end_date: validation.endDate,
        created_at: new Date().toISOString()
      });

      setSuccess(true);
      setLicenseKey('');

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err) {
      setError('حدث خطأ أثناء التفعيل. الرجاء المحاولة مرة أخرى.');
      console.error('Activation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setLicenseKey('');
      setError('');
      setSuccess(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
              <Key className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">تفعيل الاشتراك</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">تم التفعيل بنجاح!</h3>
              <p className="text-gray-600">تم تفعيل اشتراكك بنجاح</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  أدخل رمز التفعيل الذي حصلت عليه من المطور
                </p>

                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  رمز التفعيل
                </label>
                <input
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  disabled={isLoading}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all font-mono text-lg tracking-wider disabled:bg-gray-100 disabled:cursor-not-allowed"
                  maxLength={50}
                />
                <p className="text-xs text-gray-500 mt-2">
                  معرف المدرسة الحالي: <span className="font-semibold">{schoolId}</span>
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 mb-4">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleActivate}
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      جاري التفعيل...
                    </>
                  ) : (
                    'تفعيل الاشتراك'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
