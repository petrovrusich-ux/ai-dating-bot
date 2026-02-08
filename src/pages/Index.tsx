import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import Icon from '@/components/ui/icon';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'react-router-dom';
import ChatInterface from '@/components/ChatInterface';
import GirlSelectionModal from '@/components/GirlSelectionModal';
import GirlAccessDeniedDialog from '@/components/GirlAccessDeniedDialog';
import { updatePageMeta } from '@/utils/seo';

interface Girl {
  id: string;
  name: string;
  age: number;
  bio: string;
  image: string;
  personality: string[];
  level: number;
  messagesCount: number;
  unlocked: boolean;
  hasNewMessage?: boolean;
}

const mockGirls: Girl[] = [
  {
    id: '1',
    name: 'София',
    age: 23,
    bio: 'Люблю искусство и долгие разговоры о смысле жизни. Мечтаю о путешествиях.',
    image: 'https://cdn.poehali.dev/projects/226da4a1-0bd9-4d20-a164-66ae692a6341/bucket/78d49a08-78f5-45e4-afbe-1705039369a9.png',
    personality: ['Нежная', 'Романтичная', 'Загадочная'],
    level: 0,
    messagesCount: 0,
    unlocked: true,
  },
  {
    id: '2',
    name: 'Анастасия',
    age: 25,
    bio: 'Фотограф, люблю закаты и хорошую музыку. Могу быть твоей музой.',
    image: 'https://cdn.poehali.dev/projects/226da4a1-0bd9-4d20-a164-66ae692a6341/bucket/4ce890b9-495a-4240-a27a-dba25f4ab9ec.jpg',
    personality: ['Страстная', 'Артистичная', 'Смелая'],
    level: 0,
    messagesCount: 0,
    unlocked: true,
  },
  {
    id: '3',
    name: 'Виктория',
    age: 22,
    bio: 'Танцую, читаю поэзию и верю в настоящие чувства. Открой меня.',
    image: 'https://cdn.poehali.dev/projects/226da4a1-0bd9-4d20-a164-66ae692a6341/bucket/e227e415-15f1-41fc-9960-2d64287e1462.png',
    personality: ['Дерзкая', 'Веселая', 'Непредсказуемая'],
    level: 0,
    messagesCount: 0,
    unlocked: true,
  },
];

const getMaxAllowedLevel = (userSubscription: { flirt: boolean; intimate: boolean }) => {
  if (userSubscription.intimate) return 2;
  if (userSubscription.flirt) return 1;
  return 0;
};

const getLevelInfo = (level: number, messagesCount: number) => {
  if (level === 0) {
    return {
      title: '🌸 Знакомство',
      progress: (messagesCount / 20) * 100,
      description: `${messagesCount}/20 сообщений`,
      color: 'bg-intimate-pink',
    };
  }
  if (level === 1) {
    return {
      title: '💕 Флирт',
      progress: ((messagesCount - 20) / 30) * 100,
      description: `${messagesCount}/50 сообщений`,
      color: 'bg-primary',
    };
  }
  return {
    title: '🔥 Интим',
    progress: 100,
    description: 'Полный доступ',
    color: 'bg-intimate-glow',
  };
};

const getUserSubscriptionInfo = (subscription: { flirt: boolean; intimate: boolean }) => {
  if (subscription.intimate) {
    return {
      title: '🔥 Интим',
      description: 'Полный доступ',
    };
  }
  if (subscription.flirt) {
    return {
      title: '💕 Флирт',
      description: 'До 50 сообщений/день',
    };
  }
  return {
    title: '🌸 Знакомство',
    description: 'До 20 сообщений/день',
  };
};

interface IndexProps {
  userData: Record<string, unknown>;
  onLogout: () => void;
}

const SUBSCRIPTION_CACHE_TIME = 60 * 1000;

const Index = ({ userData, onLogout }: IndexProps) => {
  const [activeTab, setActiveTab] = useState('gallery');
  const [selectedGirl, setSelectedGirl] = useState<Girl | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [userSubscription, setUserSubscription] = useState<{
    flirt: boolean;
    intimate: boolean;
    total_messages?: number;
    message_limit?: number | null;
    can_send_message?: boolean;
    subscription_end?: string;
    purchase_expires?: string;
    purchase_type?: string;
    purchased_girls?: string[];
    has_all_girls?: boolean;
    limit_reset_time?: string | null;
  }>(userData?.subscription as typeof userSubscription || { flirt: false, intimate: false });
  const userId = useState(() => (userData?.user_id as string) || 'user_' + Date.now())[0];
  const [lastSubscriptionCheck, setLastSubscriptionCheck] = useState<number>(0);
  const [girlStats, setGirlStats] = useState<Record<string, { total_messages: number; relationship_level: number }>>({});
  const [activeChats, setActiveChats] = useState<Girl[]>([]);
  const [showGirlSelection, setShowGirlSelection] = useState(false);
  const [selectedPurchaseType, setSelectedPurchaseType] = useState<'one_girl' | 'all_girls'>('one_girl');
  const [selectedPurchasePrice, setSelectedPurchasePrice] = useState(0);
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [deniedGirlId, setDeniedGirlId] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const debounceTimerRef = useState<NodeJS.Timeout | null>(null)[0];

  const checkSubscription = async (userId: string, force: boolean = false) => {
    const now = Date.now();
    const lastCheck = localStorage.getItem('last_subscription_check');
    
    if (!force && lastCheck && now - parseInt(lastCheck) < SUBSCRIPTION_CACHE_TIME) {
      return userSubscription;
    }
    
    if (force && debounceTimerRef) {
      clearTimeout(debounceTimerRef);
      return new Promise((resolve) => {
        const timer = setTimeout(async () => {
          const result = await performSubscriptionCheck(userId);
          resolve(result);
        }, 300);
        Object.assign(debounceTimerRef, timer);
      });
    }
    
    return performSubscriptionCheck(userId);
  };
  
  const performSubscriptionCheck = async (userId: string) => {
    const now = Date.now();
    
    try {
      const response = await fetch(
        `https://functions.poehali.dev/71202cd5-d4ad-46f9-9593-8829421586e1?full=true&user_id=${userId}`
      );
      const data = await response.json();
      
      setUserSubscription({
        flirt: data.flirt || false,
        intimate: data.intimate || false,
        total_messages: data.total_messages || 0,
        message_limit: data.message_limit,
        can_send_message: data.can_send_message !== undefined ? data.can_send_message : true,
        subscription_end: data.subscription_end,
        purchase_expires: data.purchase_expires,
        purchase_type: data.purchase_type,
        purchased_girls: data.purchased_girls || [],
        has_all_girls: data.has_all_girls || false,
        limit_reset_time: data.limit_reset_time || null,
      });
      
      if (data.stats && Array.isArray(data.stats)) {
        const statsMap: Record<string, { total_messages: number; relationship_level: number }> = {};
        data.stats.forEach((stat: Record<string, unknown>) => {
          statsMap[stat.girl_id as string] = {
            total_messages: stat.total_messages as number,
            relationship_level: stat.relationship_level as number,
          };
        });
        setGirlStats(statsMap);
      }
      
      if (data.active_chats && Array.isArray(data.active_chats)) {
        const chats = data.active_chats
          .map((chat: Record<string, unknown>) => {
            const girl = mockGirls.find(g => g.id === chat.girl_id);
            if (!girl) return null;
            return {
              ...girl,
              level: chat.relationship_level,
              messagesCount: chat.total_messages,
              unlocked: true
            };
          })
          .filter((g: Girl | null) => g !== null);
        setActiveChats(chats);
      }
      
      localStorage.setItem('last_subscription_check', now.toString());
      setLastSubscriptionCheck(now);
      
      return data;
    } catch (error) {
      console.error('Subscription check error:', error);
      return { flirt: false, intimate: false };
    }
  };



  useEffect(() => {
    updatePageMeta(
      "AI Romance — Виртуальные отношения с искусственным интеллектом",
      "Почувствуй искру между нами! Общайся с уникальными AI персонажами, развивай отношения от знакомства до интима. Безопасно, конфиденциально, только 18+."
    );
  }, []);

  useEffect(() => {
    checkSubscription(userId);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const handleGirlClick = async (girl: Girl) => {
    const maxLevel = getMaxAllowedLevel(userSubscription);
    
    if (userSubscription.purchase_type === 'one_girl' && userSubscription.purchased_girls && userSubscription.purchased_girls.length > 0) {
      if (!userSubscription.purchased_girls.includes(girl.id)) {
        setDeniedGirlId(girl.id);
        setShowAccessDenied(true);
        return;
      }
    }
    
    const stats = girlStats[girl.id];
    const currentLevel = stats?.relationship_level ?? 0;
    
    if (currentLevel > maxLevel) {
      setDeniedGirlId(girl.id);
      setShowAccessDenied(true);
      return;
    }

    const updatedGirl = {
      ...girl,
      level: stats?.relationship_level ?? 0,
      messagesCount: stats?.total_messages ?? 0,
    };

    setSelectedGirl(updatedGirl);
    setShowChat(true);
  };

  const handlePaymentSuccess = () => {
    checkSubscription(userId, true);
    setActiveTab('gallery');
  };

  const handleChatClose = async () => {
    setShowChat(false);
    setSelectedGirl(null);
    await checkSubscription(userId, true);
  };

  if (showChat && selectedGirl) {
    return (
      <ChatInterface
        girl={selectedGirl}
        onClose={handleChatClose}
        userId={userId}
        userSubscription={userSubscription}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8 bg-card/50 backdrop-blur-sm border border-border/50">
            <TabsTrigger value="gallery" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Icon name="Users" size={18} className="mr-2" />
              Галерея
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Icon name="User" size={18} className="mr-2" />
              Профиль
            </TabsTrigger>
            <TabsTrigger value="subscription" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Icon name="CreditCard" size={18} className="mr-2" />
              Тарифы
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="animate-fade-in">
            {activeChats.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-heading font-bold mb-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <Icon name="MessageCircle" size={20} className="text-white" />
                  </div>
                  Активные чаты
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeChats.map((girl) => {
                    const levelInfo = getLevelInfo(girl.level, girl.messagesCount);
                    return (
                      <Card
                        key={girl.id}
                        className="group overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 border-2 border-primary/50 relative animate-pulse-border"
                        onClick={() => handleGirlClick(girl)}
                      >
                        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                          <Badge className="bg-primary/90 text-primary-foreground border-0 shadow-lg animate-bounce-subtle">
                            {levelInfo.title}
                          </Badge>
                          {girl.hasNewMessage && (
                            <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                          )}
                        </div>
                        <div className="relative aspect-[3/4] overflow-hidden">
                          <img
                            src={girl.image}
                            alt={girl.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        </div>
                        <CardContent className="p-5 bg-card/95 backdrop-blur-sm">
                          <h3 className="text-xl font-heading font-bold mb-2 flex items-center gap-2">
                            {girl.name}
                            <span className="text-sm text-muted-foreground font-normal">{girl.age} лет</span>
                          </h3>
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium">{levelInfo.description}</span>
                                <span className="text-muted-foreground">{Math.round(levelInfo.progress)}%</span>
                              </div>
                              <Progress value={levelInfo.progress} className="h-2" />
                            </div>
                            <div className="flex items-center gap-2 text-sm text-primary font-semibold">
                              <Icon name="MessageCircle" size={16} />
                              Продолжить общение
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            <h2 className="text-2xl font-heading font-bold mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-pink-500 flex items-center justify-center">
                <Icon name="Heart" size={20} className="text-white" />
              </div>
              {activeChats.length > 0 ? 'Откройте новые знакомства' : 'Начните знакомство'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockGirls
                .filter(girl => !activeChats.some(chat => chat.id === girl.id))
                .map((girl) => {
                  const stats = girlStats[girl.id];
                  const currentGirl = {
                    ...girl,
                    level: stats?.relationship_level ?? 0,
                    messagesCount: stats?.total_messages ?? 0,
                  };
                  const levelInfo = getLevelInfo(currentGirl.level, currentGirl.messagesCount);
                  const maxLevel = getMaxAllowedLevel(userSubscription);
                  const isLocked = currentGirl.level > maxLevel;
                  const subscriptionInfo = getUserSubscriptionInfo(userSubscription);

                  return (
                    <Card
                      key={girl.id}
                      className="group overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 border-border/50"
                      onClick={() => handleGirlClick(currentGirl)}
                    >
                      <div className="absolute top-3 right-3 z-10">
                        <Badge className="bg-card/90 backdrop-blur-sm border-border/50">
                          {subscriptionInfo.title}
                        </Badge>
                      </div>
                      <div className="relative aspect-[3/4] overflow-hidden">
                        <img
                          src={girl.image}
                          alt={girl.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {isLocked && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                            <div className="text-center text-white p-4">
                              <Icon name="Lock" size={48} className="mx-auto mb-3" />
                              <p className="font-semibold text-lg mb-1">Требуется подписка</p>
                              <p className="text-sm opacity-90">Уровень {currentGirl.level + 1}</p>
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      </div>
                      <CardContent className="p-5 bg-card/95 backdrop-blur-sm">
                        <h3 className="text-xl font-heading font-bold mb-2 flex items-center gap-2">
                          {girl.name}
                          <span className="text-sm text-muted-foreground font-normal">{girl.age} лет</span>
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{girl.bio}</p>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {girl.personality.map((trait) => (
                            <Badge key={trait} variant="secondary" className="text-xs">
                              {trait}
                            </Badge>
                          ))}
                        </div>
                        {currentGirl.messagesCount > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium">{levelInfo.description}</span>
                              <span className="text-muted-foreground">{Math.round(levelInfo.progress)}%</span>
                            </div>
                            <Progress value={levelInfo.progress} className="h-2" />
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Icon name="MessageCircle" size={16} className="text-muted-foreground" />
                            <span className="text-muted-foreground">{currentGirl.messagesCount} сообщений</span>
                          </div>
                          <Icon name="ChevronRight" size={20} className="text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              }
            </div>
          </TabsContent>

          <TabsContent value="profile" className="animate-fade-in">
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Minimalist Header */}
              <div className="relative">
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <h1 className="text-5xl md:text-6xl font-light tracking-tight mb-2">
                      {userData?.name as string || 'Александр'}
                    </h1>
                    <p className="text-lg text-muted-foreground font-light">
                      {userData?.email as string || 'email@example.com'}
                    </p>
                  </div>
                  <Button 
                    onClick={onLogout}
                    variant="ghost"
                    className="text-base font-normal hover:bg-muted"
                  >
                    Выйти
                    <Icon name="ArrowRight" size={18} className="ml-2" />
                  </Button>
                </div>
                
                {/* Big Numbers Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <div className="text-6xl md:text-7xl font-bold tracking-tighter">
                      {userSubscription.total_messages || 0}
                    </div>
                    <div className="text-sm text-muted-foreground uppercase tracking-wider">Сообщений</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-6xl md:text-7xl font-bold tracking-tighter">
                      {activeChats.length}
                    </div>
                    <div className="text-sm text-muted-foreground uppercase tracking-wider">Активных</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-6xl md:text-7xl font-bold tracking-tighter">
                      {userSubscription.message_limit || '∞'}
                    </div>
                    <div className="text-sm text-muted-foreground uppercase tracking-wider">Лимит/день</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-4xl md:text-5xl font-bold tracking-tighter pt-3">
                      {userSubscription.intimate ? 'Интим' : userSubscription.flirt ? 'Флирт' : 'Базовый'}
                    </div>
                    <div className="text-sm text-muted-foreground uppercase tracking-wider">Тариф</div>
                  </div>
                </div>
              </div>

              {/* Asymmetric Grid */}
              <div className="grid md:grid-cols-3 gap-6">
                {/* Left column - Subscription */}
                <div className="md:col-span-2 space-y-6">
                  <Card className="border-0 shadow-none bg-muted/30">
                    <CardContent className="p-8">
                      <h2 className="text-2xl font-light mb-6">Подписка</h2>
                      
                      {userSubscription.purchase_expires && userSubscription.purchase_type ? (
                        <div className="space-y-4">
                          <div className="flex items-baseline justify-between border-b border-border pb-4">
                            <span className="text-muted-foreground">Тип</span>
                            <span className="text-lg font-medium">
                              {userSubscription.purchase_type === 'one_girl' ? 'Одна девушка' : 'Все девушки'}
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between border-b border-border pb-4">
                            <span className="text-muted-foreground">Осталось</span>
                            <span className="text-lg font-medium">
                              {(() => {
                                const now = new Date();
                                const expires = new Date(userSubscription.purchase_expires);
                                const diff = expires.getTime() - now.getTime();
                                if (diff <= 0) return 'Истекло';
                                const hours = Math.floor(diff / (1000 * 60 * 60));
                                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                return `${hours}ч ${minutes}м`;
                              })()}
                            </span>
                          </div>
                        </div>
                      ) : (userSubscription.flirt || userSubscription.intimate) && userSubscription.subscription_end ? (
                        <div className="space-y-4">
                          <div className="flex items-baseline justify-between border-b border-border pb-4">
                            <span className="text-muted-foreground">План</span>
                            <span className="text-lg font-medium">
                              {userSubscription.intimate ? 'Интим' : 'Флирт'}
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between border-b border-border pb-4">
                            <span className="text-muted-foreground">До</span>
                            <span className="text-lg font-medium">
                              {new Date(userSubscription.subscription_end).toLocaleDateString('ru-RU', { 
                                day: 'numeric', 
                                month: 'short'
                              })}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Нет активной подписки</p>
                      )}
                      
                      {!userSubscription.purchase_expires && userSubscription.limit_reset_time && (
                        <div className="mt-6 pt-6 border-t border-border">
                          <div className="flex items-baseline justify-between">
                            <span className="text-muted-foreground">Обновление лимита</span>
                            <span className="text-lg font-medium tabular-nums">
                              {(() => {
                                const resetTime = new Date(userSubscription.limit_reset_time);
                                const diff = resetTime.getTime() - currentTime.getTime();
                                if (diff <= 0) return '00:00:00';
                                const hours = Math.floor(diff / (1000 * 60 * 60));
                                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                              })()}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Right column - Quick Links */}
                <div className="space-y-6">
                  <Card className="border-0 shadow-none bg-muted/30">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-light mb-4">Безопасность</h3>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <div className="flex gap-2">
                          <span className="flex-shrink-0">—</span>
                          <span>AI персонажи</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="flex-shrink-0">—</span>
                          <span>Проверка 18+</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="flex-shrink-0">—</span>
                          <span>Конфиденциально</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="flex-shrink-0">—</span>
                          <span>Удаление данных</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-0 shadow-none bg-muted/30">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-light mb-4">Контакты</h3>
                      <div className="space-y-3">
                        <a 
                          href="mailto:airomance@yandex.ru"
                          className="block text-sm hover:text-primary transition-colors"
                        >
                          airomance@yandex.ru
                        </a>
                        <a 
                          href="https://t.me/airomance1"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm hover:text-primary transition-colors"
                        >
                          @airomance1
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="subscription" className="animate-fade-in">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-4xl md:text-5xl font-heading font-bold mb-3 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Выберите свой тариф
                </h2>
                <p className="text-lg text-muted-foreground">
                  Откройте новые уровни близости и общения
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-12">
                <Card className="relative overflow-hidden border-2 border-primary/50 hover:border-primary transition-all hover:shadow-2xl hover:shadow-primary/20">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-bl-[100px]" />
                  <CardContent className="p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center">
                        <span className="text-3xl">💕</span>
                      </div>
                      <div>
                        <h3 className="text-2xl font-heading font-bold">Флирт</h3>
                        <p className="text-sm text-muted-foreground">До 50 сообщений/день</p>
                      </div>
                    </div>
                    <div className="mb-6">
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-5xl font-bold">990₽</span>
                        <span className="text-muted-foreground">/день</span>
                      </div>
                    </div>
                    <ul className="space-y-3 mb-8">
                      <li className="flex items-start gap-3">
                        <Icon name="Check" size={20} className="text-primary flex-shrink-0 mt-0.5" />
                        <span>Доступ к уровню «Флирт»</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Icon name="Check" size={20} className="text-primary flex-shrink-0 mt-0.5" />
                        <span>До 50 сообщений в день</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Icon name="Check" size={20} className="text-primary flex-shrink-0 mt-0.5" />
                        <span>Более откровенный контент</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Icon name="Check" size={20} className="text-primary flex-shrink-0 mt-0.5" />
                        <span>Развитие отношений</span>
                      </li>
                    </ul>
                    <Button
                      className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600"
                      onClick={() => {
                        setSelectedPurchaseType('all_girls');
                        setSelectedPurchasePrice(990);
                        setShowGirlSelection(true);
                      }}
                      disabled={isProcessingPayment}
                    >
                      Выбрать Флирт
                    </Button>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-2 border-red-500/50 hover:border-red-500 transition-all hover:shadow-2xl hover:shadow-red-500/20">
                  <div className="absolute top-4 right-4 z-10">
                    <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-0 shadow-lg text-sm px-3 py-1">
                      Популярный
                    </Badge>
                  </div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/20 to-transparent rounded-bl-[100px]" />
                  <CardContent className="p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
                        <span className="text-3xl">🔥</span>
                      </div>
                      <div>
                        <h3 className="text-2xl font-heading font-bold">Интим</h3>
                        <p className="text-sm text-muted-foreground">Безлимитное общение</p>
                      </div>
                    </div>
                    <div className="mb-6">
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-5xl font-bold">1490₽</span>
                        <span className="text-muted-foreground">/день</span>
                      </div>
                    </div>
                    <ul className="space-y-3 mb-8">
                      <li className="flex items-start gap-3">
                        <Icon name="Check" size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <span>Полный доступ к уровню «Интим»</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Icon name="Check" size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <span>Безлимитные сообщения</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Icon name="Check" size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <span>Самый откровенный контент</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Icon name="Check" size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <span>Максимальная близость</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Icon name="Check" size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <span>Персональные сценарии</span>
                      </li>
                    </ul>
                    <Button
                      className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700"
                      onClick={() => {
                        setSelectedPurchaseType('all_girls');
                        setSelectedPurchasePrice(1490);
                        setShowGirlSelection(true);
                      }}
                      disabled={isProcessingPayment}
                    >
                      Выбрать Интим
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                      <Icon name="Info" size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-heading font-semibold mb-2">Важная информация</h3>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <Icon name="ChevronRight" size={16} className="flex-shrink-0 mt-0.5" />
                          <span>Доступ на 24 часа с момента оплаты</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Icon name="ChevronRight" size={16} className="flex-shrink-0 mt-0.5" />
                          <span>Автопродление отсутствует</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Icon name="ChevronRight" size={16} className="flex-shrink-0 mt-0.5" />
                          <span>Все персонажи созданы искусственным интеллектом</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Icon name="ChevronRight" size={16} className="flex-shrink-0 mt-0.5" />
                          <span>Сервис только для лиц старше 18 лет</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl mt-4">
                    <Checkbox 
                      id="terms" 
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                      className="mt-1"
                    />
                    <label htmlFor="terms" className="text-sm cursor-pointer leading-relaxed">
                      Я подтверждаю, что мне исполнилось 18 лет, и я согласен с{' '}
                      <Link to="/privacy" className="text-primary hover:underline">
                        условиями использования
                      </Link>
                      {' '}и{' '}
                      <Link to="/terms" className="text-primary hover:underline">
                        политикой конфиденциальности
                      </Link>
                    </label>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <GirlSelectionModal
        isOpen={showGirlSelection}
        onClose={() => setShowGirlSelection(false)}
        girls={mockGirls}
        purchaseType={selectedPurchaseType}
        price={selectedPurchasePrice}
        userId={userId}
        onPaymentSuccess={handlePaymentSuccess}
        agreedToTerms={agreedToTerms}
      />

      <GirlAccessDeniedDialog
        isOpen={showAccessDenied}
        onClose={() => setShowAccessDenied(false)}
        onUpgrade={() => {
          setShowAccessDenied(false);
          setActiveTab('subscription');
        }}
        currentPlan={userSubscription.intimate ? 'intimate' : userSubscription.flirt ? 'flirt' : 'basic'}
        girlId={deniedGirlId}
        userSubscription={userSubscription}
      />
    </div>
  );
};

export default Index;
