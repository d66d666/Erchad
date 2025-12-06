import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

interface CustomAlertProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose: () => void
}

export function CustomAlert({ message, type = 'success', onClose }: CustomAlertProps) {
  const config = {
    success: {
      icon: CheckCircle,
      bgColor: 'from-green-500 to-green-600',
      iconColor: 'text-green-600',
      title: 'تم بنجاح!'
    },
    error: {
      icon: AlertCircle,
      bgColor: 'from-red-500 to-red-600',
      iconColor: 'text-red-600',
      title: 'تنبيه!'
    },
    info: {
      icon: Info,
      bgColor: 'from-blue-500 to-blue-600',
      iconColor: 'text-blue-600',
      title: 'معلومة'
    }
  }

  const currentConfig = config[type]
  const Icon = currentConfig.icon

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform animate-in zoom-in-95 duration-200">
        <div className={`bg-gradient-to-r ${currentConfig.bgColor} p-6 rounded-t-2xl relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
          <div className="flex flex-col items-center text-center text-white">
            <div className="bg-white/20 p-4 rounded-full mb-3 backdrop-blur-sm">
              <Icon size={48} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold">{currentConfig.title}</h2>
          </div>
        </div>

        <div className="p-8">
          <p className="text-gray-700 text-center text-lg leading-relaxed mb-6 whitespace-pre-wrap">
            {message}
          </p>

          <button
            onClick={onClose}
            className={`w-full bg-gradient-to-r ${currentConfig.bgColor} hover:opacity-90 text-white font-bold py-3.5 px-6 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg`}
          >
            موافق
          </button>
        </div>
      </div>
    </div>
  )
}
