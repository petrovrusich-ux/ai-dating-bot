import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Girl {
  id: string;
  name: string;
  age: number;
  bio: string;
  image: string;
  personality: string[];
}

interface GirlSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  girls: Girl[];
  onSelectGirl: (girlId: string) => void;
  purchaseType: 'one_girl' | 'all_girls';
  price: number;
}

const GirlSelectionModal = ({ 
  isOpen, 
  onClose, 
  girls, 
  onSelectGirl,
  purchaseType,
  price 
}: GirlSelectionModalProps) => {
  if (purchaseType === 'all_girls') {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading">
            Выберите девушку для общения
          </DialogTitle>
          <p className="text-muted-foreground">
            Режим интим на 24 часа • {price}₽
          </p>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          {girls.map((girl) => (
            <Card 
              key={girl.id}
              className="cursor-pointer hover:border-primary transition-all"
              onClick={() => onSelectGirl(girl.id)}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <img 
                    src={girl.image} 
                    alt={girl.name}
                    className="w-24 h-24 rounded-lg object-contain bg-muted"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-heading font-semibold text-lg">{girl.name}</h3>
                        <p className="text-sm text-muted-foreground">{girl.age} лет</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {girl.bio}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {girl.personality.map((trait, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {trait}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Button className="w-full mt-4">
                  Выбрать {girl.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GirlSelectionModal;