import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  product: {
    name: string;
    price: number;
    type: 'subscription' | 'one-time';
    planId: string;
    description?: string;
  };
}

const PaymentDialog = ({ open, onClose, product }: PaymentDialogProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();



  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      const userId = localStorage.getItem('user_id') || 'user_' + Date.now();
      
      const response = await fetch('https://functions.poehali.dev/8a6959b7-9e80-4eb8-936e-2c96e0606280', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          plan_type: product.planId,
        }),
      });

      const data = await response.json();

      if (data.payment_url) {
        window.location.href = data.payment_url;
      } else {
        throw new Error(data.error || 'Ошибка создания счета');
      }
    } catch (error) {
      toast({
        title: 'Ошибка оплаты',
        description: error instanceof Error ? error.message : 'Попробуйте позже',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="CreditCard" size={24} className="text-primary" />
            Оформление {product.type === 'subscription' ? 'тарифа' : 'покупки'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-lg">{product.name}</span>
              <Badge variant="default" className="text-base px-3 py-1">
                {product.price}₽
              </Badge>
            </div>
            {product.description && (
              <p className="text-sm text-muted-foreground">{product.description}</p>
            )}
            {product.type === 'subscription' && (
              <p className="text-xs text-muted-foreground mt-2">
                Автоматическое списание каждый месяц. Можно отменить в любой момент.
              </p>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Icon name="CreditCard" size={20} className="text-blue-600" />
              <span className="font-medium text-sm">Оплата через Platega</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Безопасная оплата картой или СБП. Все способы оплаты доступны на следующем шаге.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded">
            <Icon name="Shield" size={16} className="text-primary" />
            <span>Безопасная оплата через платёжную систему Platega</span>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handlePayment}
              disabled={isProcessing}
              className="flex-1"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
                  Обработка...
                </>
              ) : (
                `Оплатить ${product.price}₽`
              )}
            </Button>
            <Button onClick={onClose} variant="outline" size="lg">
              Отмена
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;