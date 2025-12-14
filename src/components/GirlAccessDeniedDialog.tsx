import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface GirlAccessDeniedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  purchasedGirlName: string;
  onBuyAllGirls: () => void;
  onGoToPurchasedGirl: () => void;
}

const GirlAccessDeniedDialog = ({ 
  isOpen, 
  onClose, 
  purchasedGirlName,
  onBuyAllGirls,
  onGoToPurchasedGirl
}: GirlAccessDeniedDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <Icon name="Lock" size={24} className="text-destructive" />
            </div>
            <DialogTitle className="text-xl">Девушка недоступна</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            У вас есть доступ только к <span className="font-semibold text-foreground">{purchasedGirlName}</span> на 24 часа.
            <br />
            <br />
            Чтобы общаться с другими девушками, купите доступ ко всем.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button 
            onClick={onBuyAllGirls}
            size="lg"
            className="w-full"
          >
            <Icon name="Unlock" size={20} className="mr-2" />
            Купить доступ ко всем девушкам
          </Button>
          
          <Button 
            onClick={onGoToPurchasedGirl}
            variant="outline"
            size="lg"
            className="w-full"
          >
            <Icon name="MessageCircle" size={20} className="mr-2" />
            Вернуться к {purchasedGirlName}
          </Button>

          <Button 
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="w-full"
          >
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GirlAccessDeniedDialog;
