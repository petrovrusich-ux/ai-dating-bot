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
      
      const response = await fetch('https://functions.poehali.dev/f302a340-c08c-4600-bf8d-28cb6d2179c9', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_type: product.planId,
          amount_rub: product.price,
          user_id: userId,
        }),
      });

      const data = await response.json();

      if (data.payment_url) {
        toast({
          title: 'Переход к оплате',
          description: 'Сейчас откроется окно CryptoBot для оплаты',
        });
        
        window.open(data.payment_url, '_blank');
        onClose();
      } else {
        throw new Error(data.error || 'Ошибка создания счета');
      }
    } catch (error) {
      toast({
        title: 'Ошибка оплаты',
        description: error instanceof Error ? error.message : 'Попробуйте позже',
        variant: 'destructive',
      });
    } finally {
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
              <Icon name="Wallet" size={20} className="text-blue-600" />
              <span className="font-medium text-sm">Оплата через CryptoBot</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Вы будете перенаправлены в CryptoBot для безопасной оплаты картой в рублях. Конвертация в USDT происходит автоматически.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded">
            <Icon name="Shield" size={16} className="text-primary" />
            <span>Безопасная криптооплата через Telegram CryptoBot</span>
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