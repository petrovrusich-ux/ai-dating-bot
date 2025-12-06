import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'sbp'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const { toast } = useToast();

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.substring(0, 19);
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const handlePayment = async () => {
    if (paymentMethod === 'card') {
      if (!cardNumber || !cardExpiry || !cardCvv) {
        toast({
          title: 'Заполните все поля',
          description: 'Введите данные карты для оплаты',
          variant: 'destructive',
        });
        return;
      }
    } else {
      if (!phoneNumber) {
        toast({
          title: 'Укажите номер телефона',
          description: 'Введите номер для СБП',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsProcessing(true);

    try {
      const response = await fetch('https://functions.poehali.dev/9ca78e26-3409-4acb-8c0c-e9e4e8a9d8d0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.planId,
          productType: product.type,
          amount: product.price,
          paymentMethod,
          paymentData:
            paymentMethod === 'card'
              ? { cardNumber, cardExpiry, cardCvv }
              : { phoneNumber },
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: '✅ Оплата успешна!',
          description: product.type === 'subscription' 
            ? `Тариф "${product.name}" активирован`
            : 'Доступ открыт навсегда',
        });
        
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 2000);
      } else {
        throw new Error(data.error || 'Ошибка оплаты');
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

          <div className="space-y-3">
            <Label>Способ оплаты</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={paymentMethod === 'card' ? 'default' : 'outline'}
                className="h-auto py-3 flex flex-col gap-1"
                onClick={() => setPaymentMethod('card')}
              >
                <Icon name="CreditCard" size={20} />
                <span className="text-xs">Банковская карта</span>
              </Button>
              <Button
                variant={paymentMethod === 'sbp' ? 'default' : 'outline'}
                className="h-auto py-3 flex flex-col gap-1"
                onClick={() => setPaymentMethod('sbp')}
              >
                <Icon name="Smartphone" size={20} />
                <span className="text-xs">СБП</span>
              </Button>
            </div>
          </div>

          {paymentMethod === 'card' ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="cardNumber">Номер карты</Label>
                <Input
                  id="cardNumber"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="expiry">Срок действия</Label>
                  <Input
                    id="expiry"
                    placeholder="MM/ГГ"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    maxLength={5}
                  />
                </div>
                <div>
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    placeholder="123"
                    type="password"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').substring(0, 3))}
                    maxLength={3}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <Label htmlFor="phone">Номер телефона</Label>
              <Input
                id="phone"
                placeholder="+7 (___) ___-__-__"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-2">
                На этот номер придёт запрос на оплату через СБП
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded">
            <Icon name="Shield" size={16} className="text-primary" />
            <span>Безопасная оплата. Данные защищены шифрованием.</span>
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