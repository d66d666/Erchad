import { useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  onClose: () => void
  duration?: number
  title?: string
}

export function Toast({ message, type = 'info', onClose, duration = 5000, title }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-gradient-to-r from-emerald-50 to-teal-50',
          border: 'border-emerald-500',
          icon: <CheckCircle className="text-emerald-600" size={24} />,
          titleColor: 'text-emerald-900',
          textColor: 'text-emerald-800'
        }
      case 'error':
        return {
          bg: 'bg-gradient-to-r from-red-50 to-rose-50',
          border: 'border-red-500',
          icon: <AlertCircle className="text-red-600" size={24} />,
          titleColor: 'text-red-900',
          textColor: 'text-red-800'
        }
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-amber-50 to-orange-50',
          border: 'border-amber-500',
          icon: <AlertTriangle className="text-amber-600" size={24} />,
          titleColor: 'text-amber-900',
          textColor: 'text-amber-800'
        }
      default:
        return {
          bg: 'bg-gradient-to-r from-blue-50 to-cyan-50',
          border: 'border-blue-500',
          icon: <Info className="text-blue-600" size={24} />,
          titleColor: 'text-blue-900',
          textColor: 'text-blue-800'
        }
    }
  }

  const styles = getStyles()

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] animate-slide-down">
      <div
        className={`${styles.bg} ${styles.border} border-r-4 rounded-xl shadow-2xl p-5 min-w-[350px] max-w-md backdrop-blur-sm`}
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-0.5">
            {styles.icon}
          </div>
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className={`${styles.titleColor} font-bold text-lg mb-1`}>
                {title}
              </h3>
            )}
            <p className={`${styles.textColor} text-base leading-relaxed whitespace-pre-line`}>
              {message}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-500 hover:text-gray-700 transition-colors p-1 hover:bg-white/50 rounded-lg"
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
