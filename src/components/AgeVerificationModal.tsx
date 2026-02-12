import { Button } from '@/components/ui/button';

interface AgeVerificationModalProps {
  onConfirm: () => void;
}

const AgeVerificationModal = ({ onConfirm }: AgeVerificationModalProps) => {
  const handleExit = () => {
    window.location.href = 'https://www.google.com';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-900/95 via-purple-800/95 to-indigo-900/95 backdrop-blur-xl">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.3),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.2),transparent_50%)]" />
      
      <div className="relative w-full max-w-md mx-4">
        <div className="bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-gray-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 border border-white/10">
          <div className="flex justify-center mb-6">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-red-600 rounded-full blur-xl opacity-60 animate-pulse" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center border-4 border-red-500/70">
                <div className="text-5xl font-bold text-white">18</div>
                <div className="absolute inset-0 rounded-full border-4 border-red-500 rotate-45">
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-red-500 -translate-y-1/2" />
                </div>
              </div>
            </div>
          </div>
          
          <h1 className="text-5xl font-black text-center mb-2 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent animate-gradient">
            AI ROMANCE
          </h1>
          
          <h2 className="text-2xl font-bold text-center mb-6 text-white">
            Контент для взрослых 18+
          </h2>
          
          <div className="space-y-4 mb-8 text-gray-300 text-center">
            <p className="text-base leading-relaxed">
              Этот сайт содержит материалы откровенного характера, предназначенные исключительно для совершеннолетних пользователей.
            </p>
            <p className="text-sm leading-relaxed text-gray-400">
              Продолжая, вы подтверждаете, что вам исполнилось 18 лет.
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={onConfirm}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 text-white shadow-lg shadow-purple-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/60 rounded-2xl"
              size="lg"
            >
              Мне есть 18 лет
            </Button>
            
            <Button
              onClick={handleExit}
              variant="ghost"
              className="w-full h-12 text-base font-semibold text-gray-400 hover:text-white hover:bg-white/10 rounded-2xl transition-all duration-300"
              size="lg"
            >
              Выход
            </Button>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Нажимая кнопку, вы принимаете условия использования
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgeVerificationModal;