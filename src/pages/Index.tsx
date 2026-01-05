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
    image: 'https://cdn.poehali.dev/projects/226da4a1-0bd9-4d20-a164-66ae692a6341/files/6147b4a2-6c60-4638-a5f4-29e331a21609.jpg',
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
    image: 'https://cdn.poehali.dev/projects/226da4a1-0bd9-4d20-a164-66ae692a6341/files/9397c83f-dbf6-4071-8280-46c17107c166.jpg',
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
    image: 'https://cdn.poehali.dev/projects/226da4a1-0bd9-4d20-a164-66ae692a6341/files/b91a1828-cdb5-457c-a11a-f629175d21b9.jpg',
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
  userData: any;
  onLogout: () => void;
}

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
  }>(userData?.subscription || { flirt: false, intimate: false });
  const userId = userData?.user_id || 'user_' + Date.now();
  const [girlStats, setGirlStats] = useState<Record<string, { total_messages: number; relationship_level: number }>>({});
  const [activeChats, setActiveChats] = useState<Girl[]>([]);
  const [showGirlSelection, setShowGirlSelection] = useState(false);
  const [selectedPurchaseType, setSelectedPurchaseType] = useState<'one_girl' | 'all_girls'>('one_girl');
  const [selectedPurchasePrice, setSelectedPurchasePrice] = useState(0);
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [deniedGirlId, setDeniedGirlId] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());

  const checkSubscription = async (userId: string) => {
    try {
      const response = await fetch(
        `https://functions.poehali.dev/71202cd5-d4ad-46f9-9593-8829421586e1?subscription=true&user_id=${userId}`
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
      
      return data;
    } catch (error) {
      console.error('Subscription check error:', error);
      return { flirt: false, intimate: false };
    }
  };

  const loadGirlStats = async (userId: string) => {
    try {
      const response = await fetch(
        `https://functions.poehali.dev/71202cd5-d4ad-46f9-9593-8829421586e1?stats=true&user_id=${userId}`
      );
      const data = await response.json();
      
      if (data.stats && Array.isArray(data.stats)) {
        const statsMap: Record<string, { total_messages: number; relationship_level: number }> = {};
        data.stats.forEach((stat: any) => {
          statsMap[stat.girl_id] = {
            total_messages: stat.total_messages,
            relationship_level: stat.relationship_level,
          };
        });
        setGirlStats(statsMap);
      }
    } catch (error) {
      console.error('Stats loading error:', error);
    }
  };

  const loadActiveChats = async (userId: string) => {
    try {
      const response = await fetch(
        `https://functions.poehali.dev/71202cd5-d4ad-46f9-9593-8829421586e1?active_chats=true&user_id=${userId}`
      );
      const data = await response.json();
      
      if (data.active_chats && Array.isArray(data.active_chats)) {
        const chats = data.active_chats
          .map((chat: any) => {
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
    } catch (error) {
      console.error('Active chats loading error:', error);
    }
  };

  useEffect(() => {
    updatePageMeta(
      "AI Romance — Виртуальные отношения с искусственным интеллектом",
      "Почувствуй искру между нами! Общайся с уникальными AI-персонажами, выстраивай отношения и получай незабываемые впечатления. Безопасно, анонимно, конфиденциально.",
      "ai dating, виртуальное общение, ai романтика, чат с ai, виртуальная девушка, ai girlfriend"
    );
    
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success') {
      setTimeout(() => {
        checkSubscription(userId);
        window.history.replaceState({}, '', '/');
      }, 1000);
    }
    
    checkSubscription(userId);
    loadGirlStats(userId);
    loadActiveChats(userId);
  }, [userId]);

  // Автоматическое обновление таймера каждую секунду
  useEffect(() => {
    if (userSubscription.limit_reset_time) {
      const interval = setInterval(() => {
        const now = new Date();
        setCurrentTime(now);
        const resetTime = new Date(userSubscription.limit_reset_time);
        const diff = resetTime.getTime() - now.getTime();
        
        // Если время вышло, обновляем подписку
        if (diff <= 0) {
          checkSubscription(userId);
          clearInterval(interval);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [userSubscription.limit_reset_time, userId]);

  const handleOpenChat = async (girl: Girl) => {
    const subData = await checkSubscription(userId);
    
    // Проверяем доступ к девушке для покупки "одна девушка"
    if (subData.purchase_type === 'one_girl' && !subData.has_all_girls) {
      const purchasedGirls = subData.purchased_girls || [];
      if (!purchasedGirls.includes(girl.id)) {
        setDeniedGirlId(girl.id);
        setShowAccessDenied(true);
        return;
      }
    }
    
    // Обновляем данные девушки актуальной статистикой
    const stats = girlStats[girl.id];
    const updatedGirl = stats ? {
      ...girl,
      messagesCount: stats.total_messages,
      level: stats.relationship_level,
      unlocked: true
    } : girl;
    
    setSelectedGirl(updatedGirl);
    setShowChat(true);
  };

  const handleBuyAllGirls = async () => {
    setShowAccessDenied(false);
    await handleSubscribe('all_girls', 20);
  };

  const handleGoToPurchasedGirl = () => {
    setShowAccessDenied(false);
    const purchasedGirlId = userSubscription.purchased_girls?.[0];
    if (purchasedGirlId) {
      const girl = mockGirls.find(g => g.id === purchasedGirlId);
      if (girl) {
        handleOpenChat(girl);
      }
    }
  };

  const handleCloseChat = () => {
    setShowChat(false);
    setSelectedGirl(null);
    loadGirlStats(userId);
    loadActiveChats(userId);
  };

  const handleDeleteChat = async (girlId: string) => {
    try {
      const response = await fetch('https://functions.poehali.dev/71202cd5-d4ad-46f9-9593-8829421586e1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete_chat',
          user_id: userId,
          girl_id: girlId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowChat(false);
        setSelectedGirl(null);
        loadGirlStats(userId);
        loadActiveChats(userId);
      }
    } catch (error) {
      console.error('Delete chat error:', error);
    }
  };

  const handleSubscribe = async (planType: string, amount: number) => {
    if (planType === 'one_girl') {
      setSelectedPurchaseType('one_girl');
      setSelectedPurchasePrice(amount);
      setShowGirlSelection(true);
      return;
    }

    setIsProcessingPayment(true);
    
    try {
      const response = await fetch('https://functions.poehali.dev/8a6959b7-9e80-4eb8-936e-2c96e0606280', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          plan_type: planType,
        }),
      });

      const data = await response.json();

      if (data.payment_url) {
        window.location.href = data.payment_url;
      } else {
        alert('Ошибка создания платежа: ' + (data.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Ошибка соединения. Проверьте интернет и попробуйте снова.');
      setIsProcessingPayment(false);
    }
  };

  const handleGirlSelect = async (girlId: string) => {
    setShowGirlSelection(false);
    setIsProcessingPayment(true);
    
    try {
      const response = await fetch('https://functions.poehali.dev/8a6959b7-9e80-4eb8-936e-2c96e0606280', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          plan_type: selectedPurchaseType,
          girl_id: girlId,
        }),
      });

      const data = await response.json();

      if (data.payment_url) {
        window.location.href = data.payment_url;
      } else {
        alert('Ошибка создания платежа. Попробуйте позже.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Ошибка соединения. Проверьте интернет и попробуйте снова.');
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <header className="mb-8">
          <h1 className="text-5xl md:text-6xl font-heading font-bold text-foreground mb-3 animate-fade-in neon-text">
            AI ROMANCE
          </h1>
          <p className="text-muted-foreground text-lg spray-underline inline-block">
            Прогрессивные отношения с AI-девушками 18+
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="gallery" className="flex items-center gap-2">
              <Icon name="Grid3x3" size={18} />
              Галерея
            </TabsTrigger>
            <TabsTrigger value="chats" className="flex items-center gap-2">
              <Icon name="MessageCircle" size={18} />
              Диалоги
              {activeChats.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeChats.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <Icon name="User" size={18} />
              Профиль
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <Icon name="Crown" size={18} />
              Тарифы
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockGirls.map((girl) => {
                const stats = girlStats[girl.id];
                const actualLevel = stats ? stats.relationship_level : girl.level;
                const displayMessagesCount = stats ? stats.total_messages : girl.messagesCount;
                const subscriptionInfo = getUserSubscriptionInfo(userSubscription);
                return (
                  <Card
                    key={girl.id}
                    className="overflow-hidden hover:scale-105 transition-all duration-300 cursor-pointer group"
                    onClick={() => handleOpenChat(girl)}
                  >
                    <div className="relative h-64 overflow-hidden">
                      <img
                        src={girl.image}
                        alt={girl.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-90" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-2xl font-heading font-bold text-white">
                            {girl.name}, {girl.age}
                          </h3>
                          {!girl.unlocked && (
                            <Icon name="Lock" size={20} className="text-accent" />
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {girl.personality.map((trait) => (
                            <Badge
                              key={trait}
                              variant="secondary"
                              className="bg-background/50 backdrop-blur-sm text-xs"
                            >
                              {trait}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground mb-4">{girl.bio}</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{subscriptionInfo.title}</span>
                          <span className="text-muted-foreground">{subscriptionInfo.description}</span>
                        </div>
                        {stats && stats.total_messages > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            💬 {stats.total_messages} {stats.total_messages === 1 ? 'сообщение' : stats.total_messages < 5 ? 'сообщения' : 'сообщений'}
                          </div>
                        )}
                      </div>
                      <Button 
                        className="w-full mt-4" 
                        variant={girl.unlocked ? 'default' : 'outline'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenChat(girl);
                        }}
                      >
                        {girl.unlocked ? 'Продолжить общение' : 'Начать знакомство'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="chats" className="animate-fade-in">
            <div className="space-y-4">
              {activeChats.length === 0 ? (
                <div className="text-center py-12">
                  <Icon name="MessageCircle" size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-heading font-semibold mb-2">Нет активных диалогов</h3>
                  <p className="text-muted-foreground mb-4">Начните общение с девушками из галереи</p>
                  <Button onClick={() => setActiveTab('gallery')}>
                    Перейти в галерею
                  </Button>
                </div>
              ) : (
                activeChats.map((girl) => {
                  const stats = girlStats[girl.id];
                  const actualLevel = stats ? stats.relationship_level : girl.level;
                  const displayMessagesCount = stats ? stats.total_messages : girl.messagesCount;
                  const subscriptionInfo = getUserSubscriptionInfo(userSubscription);
                  return (
                    <Card
                      key={girl.id}
                      className="overflow-hidden hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleOpenChat(girl)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <Avatar className="h-16 w-16">
                              <AvatarImage src={girl.image} alt={girl.name} />
                              <AvatarFallback>{girl.name[0]}</AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-heading font-semibold text-lg">{girl.name}</h3>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {subscriptionInfo.title}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {displayMessagesCount} сообщений
                              </span>
                            </div>
                          </div>
                          <Icon name="ChevronRight" size={20} className="text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="profile" className="animate-fade-in">
            <div className="max-w-2xl mx-auto space-y-6">
              <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
                <CardContent className="relative p-6">
                  <div className="flex flex-col md:flex-row items-center md:items-start justify-between mb-6 gap-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-accent rounded-full blur-xl opacity-75 group-hover:opacity-100 transition-opacity animate-pulse-glow" />
                        <Avatar className="relative h-28 w-28 ring-4 ring-background/50 shadow-2xl">
                          <AvatarFallback className="text-3xl bg-gradient-to-br from-primary via-secondary to-accent text-white font-bold">
                            {userData?.name?.charAt(0).toUpperCase() || 'А'}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="text-center md:text-left">
                        <h2 className="text-3xl font-heading font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-2">
                          {userData?.name || 'Александр'}
                        </h2>
                        <p className="text-muted-foreground">{userData?.email || 'email@example.com'}</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={onLogout} 
                      className="flex items-center gap-2 hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-destructive to-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Icon name="LogOut" size={16} className="text-white" />
                      </div>
                      Выйти
                    </Button>
                  </div>

                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border border-border/50 p-5">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5" />
                    <div className="relative flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center">
                        <Icon name="Crown" size={20} className="text-white" />
                      </div>
                      <span className="font-semibold text-lg">Статус тарифа</span>
                    </div>
                    {userSubscription.purchase_expires && userSubscription.purchase_type ? (
                      <div className="relative space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-background/30">
                          <span className="text-sm font-medium text-muted-foreground">Разовая покупка:</span>
                          <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 shadow-lg">
                            {userSubscription.purchase_type === 'one_girl' ? '👤 Одна девушка' : '👥 Все девушки'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-background/30">
                          <span className="text-sm font-medium text-muted-foreground">Осталось времени:</span>
                          <span className="text-sm font-semibold text-primary">
                            {(() => {
                              const now = new Date();
                              const expires = new Date(userSubscription.purchase_expires);
                              const diff = expires.getTime() - now.getTime();
                              
                              if (diff <= 0) {
                                return '⏱️ Истекло';
                              }
                              
                              const hours = Math.floor(diff / (1000 * 60 * 60));
                              const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                              return `⏱️ ${hours}ч ${minutes}м`;
                            })()}
                          </span>
                        </div>
                      </div>
                    ) : (userSubscription.flirt || userSubscription.intimate) && userSubscription.subscription_end && !userSubscription.subscription_end.includes('2099') ? (
                      <div className="relative space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-background/30">
                          <span className="text-sm font-medium text-muted-foreground">Активный тариф:</span>
                          <Badge 
                            className={userSubscription.intimate 
                              ? "bg-gradient-to-r from-red-500 to-orange-600 text-white border-0 shadow-lg" 
                              : "bg-gradient-to-r from-pink-500 to-red-500 text-white border-0 shadow-lg"
                            }
                          >
                            {userSubscription.intimate ? "🔥 Интим" : "💕 Флирт"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-background/30">
                          <span className="text-sm font-medium text-muted-foreground">Действует до:</span>
                          <span className="text-sm font-semibold">
                            {new Date(userSubscription.subscription_end).toLocaleDateString('ru-RU', { 
                              day: 'numeric', 
                              month: 'long',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground p-3 rounded-lg bg-background/30">Тариф не подключён</p>
                    )}
                    
                    {/* Таймер обнуления лимита */}
                    {userSubscription.limit_reset_time && (
                      <div className="relative mt-4 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center animate-pulse">
                              <Icon name="Clock" size={20} className="text-white" />
                            </div>
                            <span className="text-sm font-medium">До обновления лимита:</span>
                          </div>
                          <span className="text-lg font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                            {(() => {
                              const resetTime = new Date(userSubscription.limit_reset_time);
                              const diff = resetTime.getTime() - currentTime.getTime();
                              
                              if (diff <= 0) {
                                return '⏱️ Обновляется...';
                              }
                              
                              const hours = Math.floor(diff / (1000 * 60 * 60));
                              const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                              const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                              return `${hours}ч ${minutes}м ${seconds}с`;
                            })()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-xl">
                <CardContent className="p-6">
                  <h3 className="font-heading font-semibold text-lg mb-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                      <Icon name="Shield" size={20} className="text-white" />
                    </div>
                    Безопасность и конфиденциальность
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <span className="text-xl">🤖</span>
                      <p className="text-sm">Все персонажи созданы искусственным интеллектом</p>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <span className="text-xl">🔞</span>
                      <p className="text-sm">Строгая проверка возраста 18+</p>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <span className="text-xl">🔒</span>
                      <p className="text-sm">Ваши данные полностью конфиденциальны</p>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <span className="text-xl">🗑️</span>
                      <p className="text-sm">Возможность удалить аккаунт в любой момент</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-xl">
                <CardContent className="p-6">
                  <h3 className="font-heading font-semibold text-lg mb-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <Icon name="Phone" size={20} className="text-white" />
                    </div>
                    Контакты
                  </h3>
                  <div className="grid md:grid-cols-2 gap-3 mb-4">
                    <a href="mailto:airomance@yandex.ru" className="group p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Icon name="Mail" size={18} className="text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">Почта</p>
                          <p className="text-sm font-semibold group-hover:text-primary transition-colors">airomance@yandex.ru</p>
                        </div>
                      </div>
                    </a>

                    <a href="https://t.me/airomance1" target="_blank" rel="noopener noreferrer" className="group p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Icon name="MessageCircle" size={18} className="text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">Telegram</p>
                          <p className="text-sm font-semibold group-hover:text-primary transition-colors">@airomance1</p>
                        </div>
                      </div>
                    </a>

                    <a href="tel:+79614009996" className="group p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Icon name="Phone" size={18} className="text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">Телефон</p>
                          <p className="text-sm font-semibold group-hover:text-primary transition-colors">+7 961 400-99-96</p>
                        </div>
                      </div>
                    </a>

                    <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                          <Icon name="MapPin" size={18} className="text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">Адрес</p>
                          <p className="text-sm font-semibold">123298</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Реквизиты</p>
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold">Петров И.Д.</p>
                      <p className="text-sm text-muted-foreground font-mono">ИНН: 616809818160</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="subscription" className="animate-fade-in">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-4xl md:text-5xl font-heading font-bold mb-3 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Выберите свой план
                </h2>
                <p className="text-muted-foreground text-lg">
                  Разблокируйте все возможности интимного общения 🔥
                </p>
              </div>

              <Card className="mb-6 relative overflow-hidden border-2 border-primary/50 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 shadow-xl">
                {!agreedToTerms && (
                  <div className="absolute -left-12 top-1/2 -translate-y-1/2 bounce-arrow">
                    <div className="flex items-center gap-2">
                      <div className="text-4xl">👈</div>
                      <div className="bg-primary text-white px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap shadow-lg">
                        Нажми сюда!
                      </div>
                    </div>
                  </div>
                )}
                <CardContent className="p-5">
                  <label htmlFor="terms" className="flex items-start gap-4 cursor-pointer">
                    <div className="relative flex-shrink-0">
                      <Checkbox 
                        id="terms" 
                        checked={agreedToTerms}
                        onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                        className="mt-1 h-6 w-6 border-2 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-primary data-[state=checked]:to-secondary cursor-pointer"
                      />
                      {!agreedToTerms && (
                        <div className="absolute inset-0 animate-ping rounded border-2 border-primary pointer-events-none" />
                      )}
                    </div>
                    <div className="text-sm leading-relaxed flex-1">
                      <span className="font-semibold">Я ознакомился и согласен с условиями </span>
                      <Link to="/offer" className="text-primary hover:underline font-bold underline decoration-2 decoration-primary/50" onClick={(e) => e.stopPropagation()}>
                        публичной оферты
                      </Link>
                      <span className="font-semibold"> и </span>
                      <Link to="/privacy" className="text-primary hover:underline font-bold underline decoration-2 decoration-primary/50" onClick={(e) => e.stopPropagation()}>
                        политики конфиденциальности
                      </Link>
                    </div>
                  </label>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <Card className="relative overflow-hidden border-2 border-primary/50 bg-gradient-to-br from-card/80 to-card backdrop-blur-xl shadow-2xl hover:scale-105 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
                  <CardContent className="relative p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Badge className="bg-gradient-to-r from-pink-500 to-red-500 text-white border-0 px-3 py-1 text-xs font-bold shadow-lg">
                        💕 Популярный
                      </Badge>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center animate-pulse-glow">
                        <Icon name="Heart" size={24} className="text-white" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-heading font-bold mb-2 bg-gradient-to-r from-pink-400 to-red-500 bg-clip-text text-transparent">
                      Флирт
                    </h3>
                    <div className="mb-6">
                      <span className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">20 ₽</span>
                      <span className="text-muted-foreground text-lg"> / неделя</span>
                    </div>
                    <ul className="space-y-3 mb-6">
                      <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-primary/5 transition-colors">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon name="Check" size={14} className="text-white" />
                        </div>
                        <span className="text-sm font-medium">Для тех, кто хочет попробовать</span>
                      </li>
                      <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-primary/5 transition-colors">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon name="Check" size={14} className="text-white" />
                        </div>
                        <span className="text-sm font-medium">50 сообщений в день</span>
                      </li>
                      <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-primary/5 transition-colors">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon name="Check" size={14} className="text-white" />
                        </div>
                        <span className="text-sm font-medium">Все девушки разблокированы</span>
                      </li>
                      <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-primary/5 transition-colors">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon name="Check" size={14} className="text-white" />
                        </div>
                        <span className="text-sm font-medium">Быстрый ответ AI</span>
                      </li>
                    </ul>
                    <Button 
                      className="w-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105" 
                      size="lg"
                      onClick={() => handleSubscribe('flirt', 20)}
                      disabled={isProcessingPayment || !agreedToTerms}
                    >
                      {isProcessingPayment ? '⏳ Обработка...' : '💕 Подключить тариф'}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-2 border-red-500/50 bg-gradient-to-br from-card/80 to-card backdrop-blur-xl shadow-2xl hover:scale-105 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-orange-500/5 to-red-500/10" />
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full blur-3xl" />
                  <CardContent className="relative p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Badge className="bg-gradient-to-r from-red-500 to-orange-600 text-white border-0 px-3 py-1 text-xs font-bold shadow-lg">
                        🔥 Premium
                      </Badge>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-orange-600 flex items-center justify-center animate-pulse-glow">
                        <Icon name="Flame" size={24} className="text-white" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-heading font-bold mb-2 bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent">
                      Интим
                    </h3>
                    <div className="mb-6">
                      <span className="text-5xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">20 ₽</span>
                      <span className="text-muted-foreground text-lg"> / неделя</span>
                    </div>
                    <ul className="space-y-3 mb-6">
                      <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-red-500/5 transition-colors">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon name="Check" size={14} className="text-white" />
                        </div>
                        <span className="text-sm font-medium">Всё из плана "Флирт"</span>
                      </li>
                      <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-red-500/5 transition-colors">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon name="Check" size={14} className="text-white" />
                        </div>
                        <span className="text-sm font-medium">🔥 Возможность попросить фото</span>
                      </li>
                      <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-red-500/5 transition-colors">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon name="Check" size={14} className="text-white" />
                        </div>
                        <span className="text-sm font-medium">❤️ Безлимитные сообщения</span>
                      </li>
                      <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-red-500/5 transition-colors">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon name="Check" size={14} className="text-white" />
                        </div>
                        <span className="text-sm font-medium">👍 NSFW без ограничений</span>
                      </li>
                    </ul>
                    <Button 
                      className="w-full bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105" 
                      size="lg"
                      onClick={() => handleSubscribe('intimate', 20)}
                      disabled={isProcessingPayment || !agreedToTerms}
                    >
                      {isProcessingPayment ? '⏳ Обработка...' : '🔥 Подключить тариф'}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-muted/50">
                <CardContent className="p-6">
                  <h3 className="font-heading font-semibold text-lg mb-4">
                    Разовые покупки
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className={`bg-card p-4 rounded-lg transition-colors ${agreedToTerms ? 'cursor-pointer hover:bg-muted/50' : 'opacity-50 cursor-not-allowed'}`} onClick={() => agreedToTerms && handleSubscribe('one_girl', 20)}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Одна девушка на 24 часа</span>
                        <Badge>20₽</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Режим интим с одной девушкой на выбор ровно на сутки</p>
                    </div>
                    <div className={`bg-card p-4 rounded-lg transition-colors ${agreedToTerms ? 'cursor-pointer hover:bg-muted/50' : 'opacity-50 cursor-not-allowed'}`} onClick={() => agreedToTerms && handleSubscribe('all_girls', 20)}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Все девушки на 1 день</span>
                        <Badge>20₽</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Режим интим со всеми девушками на 24 часа</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {showChat && selectedGirl && (
        <ChatInterface 
          girl={selectedGirl} 
          onClose={handleCloseChat} 
          userSubscription={userSubscription}
          userId={userId}
          onDeleteChat={handleDeleteChat}
          onShowSubscription={() => setActiveTab('subscription')}
        />
      )}

      <GirlSelectionModal
        isOpen={showGirlSelection}
        onClose={() => setShowGirlSelection(false)}
        girls={mockGirls}
        onSelectGirl={handleGirlSelect}
        purchaseType={selectedPurchaseType}
        price={selectedPurchasePrice}
      />

      <GirlAccessDeniedDialog
        isOpen={showAccessDenied}
        onClose={() => setShowAccessDenied(false)}
        purchasedGirlName={mockGirls.find(g => g.id === userSubscription.purchased_girls?.[0])?.name || 'выбранной девушке'}
        onBuyAllGirls={handleBuyAllGirls}
        onGoToPurchasedGirl={handleGoToPurchasedGirl}
      />
    </div>
  );
};

export default Index;