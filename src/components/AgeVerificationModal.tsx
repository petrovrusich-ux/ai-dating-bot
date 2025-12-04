import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

const AgeVerificationModal = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasVerified = localStorage.getItem('age_verified');
    if (!hasVerified) {
      setIsVisible(true);
    }
  }, []);

  const handleConfirm = () => {
    localStorage.setItem('age_verified', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

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

          <Button
            onClick={handleConfirm}
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            Мне есть 18 лет
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AgeVerificationModal;
