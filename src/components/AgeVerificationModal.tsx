import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface AgeVerificationModalProps {
  onConfirm: () => void;
}

const AgeVerificationModal = ({ onConfirm }: AgeVerificationModalProps) => {
  const handleExit = () => {
    window.location.href = 'https://www.google.com';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4">
        <div className="bg-card border-2 border-destructive rounded-xl shadow-2xl p-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-destructive/20 rounded-full flex items-center justify-center">
              <Icon name="AlertTriangle" size={48} className="text-destructive" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-center mb-4 text-foreground">
            Предупреждение 18+
          </h2>
          
          <div className="space-y-4 mb-6 text-muted-foreground text-center">
            <p className="text-base">
              Данный сайт содержит контент для взрослых, сгенерированный искусственным интеллектом.
            </p>
            <p className="text-sm">
              Подтверждая доступ, вы заявляете, что вам исполнилось 18 лет и вы не против просмотра материалов для взрослых.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={onConfirm}
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              Мне есть 18 лет
            </Button>
            
            <Button
              onClick={handleExit}
              variant="outline"
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              Выход
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgeVerificationModal;