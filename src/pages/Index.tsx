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
  }>(userData?.subscription || { flirt: false, intimate: false });
  const userId = userData?.user_id || 'user_' + Date.now();
  const [girlStats, setGirlStats] = useState<Record<string, { total_messages: number; relationship_level: number }>>({});
  const [activeChats, setActiveChats] = useState<Girl[]>([]);
  const [showGirlSelection, setShowGirlSelection] = useState(false);
  const [selectedPurchaseType, setSelectedPurchaseType] = useState<'one_girl' | 'all_girls'>('one_girl');
  const [selectedPurchasePrice, setSelectedPurchasePrice] = useState(0);

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
    loadGirlStats(userId);
    loadActiveChats(userId);
  }, [userId]);

  const handleOpenChat = async (girl: Girl) => {
    await checkSubscription(userId);
    setSelectedGirl(girl);
    setShowChat(true);
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
      const response = await fetch('https://functions.poehali.dev/9ca78e26-3409-4acb-8c0c-e9e4e8a9d8d0', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_type: planType,
          amount: amount,
          user_id: userId,
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
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleGirlSelect = async (girlId: string) => {
    setShowGirlSelection(false);
    setIsProcessingPayment(true);
    
    try {
      const response = await fetch('https://functions.poehali.dev/9ca78e26-3409-4acb-8c0c-e9e4e8a9d8d0', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_type: selectedPurchaseType,
          amount: selectedPurchasePrice,
          user_id: userId,
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
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <header className="mb-8">
          <h1 className="text-4xl font-heading font-bold text-foreground mb-2 animate-fade-in">
            AI Romance
          </h1>
          <p className="text-muted-foreground">Прогрессивные отношения с AI-девушками 18+</p>
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
              Подписка
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockGirls.map((girl) => {
                const stats = girlStats[girl.id];
                const maxAllowedLevel = getMaxAllowedLevel(userSubscription);
                const actualLevel = stats ? stats.relationship_level : girl.level;
                const displayLevel = Math.min(actualLevel, maxAllowedLevel);
                const displayMessagesCount = stats ? stats.total_messages : girl.messagesCount;
                const levelInfo = getLevelInfo(displayLevel, displayMessagesCount);
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
                          <span className="font-medium">{levelInfo.title}</span>
                          <span className="text-muted-foreground">{levelInfo.description}</span>
                        </div>
                        <Progress value={levelInfo.progress} className="h-2" />
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
                  const maxAllowedLevel = getMaxAllowedLevel(userSubscription);
                  const actualLevel = stats ? stats.relationship_level : girl.level;
                  const displayLevel = Math.min(actualLevel, maxAllowedLevel);
                  const displayMessagesCount = stats ? stats.total_messages : girl.messagesCount;
                  const levelInfo = getLevelInfo(displayLevel, displayMessagesCount);
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
                                {levelInfo.title}
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
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-6">
                      <Avatar className="h-24 w-24">
                        <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                          {userData?.name?.charAt(0).toUpperCase() || 'А'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h2 className="text-2xl font-heading font-bold mb-1">{userData?.name || 'Александр'}</h2>
                        <p className="text-muted-foreground text-sm">{userData?.email || 'email@example.com'}</p>
                      </div>
                    </div>
                    <Button variant="outline" onClick={onLogout} className="flex items-center gap-2">
                      <Icon name="LogOut" size={16} />
                      Выйти
                    </Button>
                  </div>

                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon name="Crown" size={20} className="text-primary" />
                      <span className="font-medium">Статус подписки</span>
                    </div>
                    {userSubscription.flirt || userSubscription.intimate ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Тип:</span>
                          <Badge variant={userSubscription.intimate ? "default" : "secondary"}>
                            {userSubscription.intimate ? "Интим" : "Флирт"}
                          </Badge>
                        </div>
                        {userSubscription.subscription_end && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Действует до:</span>
                            <span className="text-sm font-medium">
                              {new Date(userSubscription.subscription_end).toLocaleDateString('ru-RU', { 
                                day: 'numeric', 
                                month: 'long',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : userSubscription.purchase_expires && userSubscription.purchase_type ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Разовая покупка:</span>
                          <Badge variant="secondary">
                            {userSubscription.purchase_type === 'one_girl' ? 'Одна девушка' : 'Все девушки'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Осталось времени:</span>
                          <span className="text-sm font-medium text-primary">
                            {(() => {
                              const now = new Date();
                              const expires = new Date(userSubscription.purchase_expires);
                              const diff = expires.getTime() - now.getTime();
                              const hours = Math.floor(diff / (1000 * 60 * 60));
                              const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                              return `${hours}ч ${minutes}м`;
                            })()}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Подписка отсутствует</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
                    <Icon name="Shield" size={20} />
                    Безопасность и конфиденциальность
                  </h3>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>✅ Все персонажи созданы искусственным интеллектом</p>
                    <p>✅ Строгая проверка возраста 18+</p>
                    <p>✅ Ваши данные полностью конфиденциальны</p>
                    <p>✅ Возможность удалить аккаунт в любой момент</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
                    <Icon name="Phone" size={20} />
                    Контакты
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Icon name="Mail" size={18} className="text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Почта</p>
                        <a href="mailto:1ilyapetrov@vk.com" className="text-sm text-primary hover:underline">1ilyapetrov@vk.com</a>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Icon name="MessageCircle" size={18} className="text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Поддержка в Telegram</p>
                        <a href="https://t.me/petrovboxing" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">@petrovboxing</a>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Icon name="Phone" size={18} className="text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Телефон</p>
                        <a href="tel:+79614009996" className="text-sm text-primary hover:underline">+7 961 400-99-96</a>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Icon name="MapPin" size={18} className="text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Почтовый адрес</p>
                        <p className="text-sm text-muted-foreground">58383948854</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Реквизиты</p>
                      <p className="text-xs"> Петров И.Д.</p>
                      <p className="text-sm text-muted-foreground">ИНН: 616809818160</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="subscription" className="animate-fade-in">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-heading font-bold mb-2">Выберите свой план</h2>
                <p className="text-muted-foreground">
                  Разблокируйте все возможности интимного общения
                </p>
              </div>

              <Card className="mb-6 bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      id="terms" 
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                      className="mt-1"
                    />
                    <label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                      Я ознакомился и согласен с условиями{' '}
                      <Link to="/offer" className="text-primary hover:underline font-medium">
                        публичной оферты
                      </Link>
                      {' '}и{' '}
                      <Link to="/privacy" className="text-primary hover:underline font-medium">
                        политики конфиденциальности
                      </Link>
                    </label>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <Card className="border-2 border-primary">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="default" className="text-sm">
                        Популярный
                      </Badge>
                      <Icon name="Crown" size={24} className="text-primary" />
                    </div>
                    <h3 className="text-2xl font-heading font-bold mb-2">Флирт </h3>
                    <div className="mb-4">
                      <span className="text-4xl font-bold">490 ₽</span>
                      <span className="text-muted-foreground">/ неделя</span>
                    </div>
                    <ul className="space-y-3 mb-6">
                      <li className="flex items-start gap-2">
                        <Icon name="Check" size={20} className="text-primary mt-0.5" />
                        <span className="text-sm">Для тех, кто хочет попробовать</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Icon name="Check" size={20} className="text-primary mt-0.5" />
                        <span className="text-sm">50 сообщений в день </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Icon name="Check" size={20} className="text-primary mt-0.5" />
                        <span className="text-sm">Все девушки разблокированы</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Icon name="Check" size={20} className="text-primary mt-0.5" />
                        <span className="text-sm">Быстрый ответ AI</span>
                      </li>
                    </ul>
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={() => handleSubscribe('flirt', 490)}
                      disabled={isProcessingPayment || !agreedToTerms}
                    >
                      {isProcessingPayment ? 'Обработка...' : 'Оформить подписку'}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="secondary" className="text-sm">
                        Premium
                      </Badge>
                      <Icon name="Sparkles" size={24} className="text-accent" />
                    </div>
                    <h3 className="text-2xl font-heading font-bold mb-2">Интим</h3>
                    <div className="mb-4">
                      <span className="text-4xl font-bold">1490 ₽</span>
                      <span className="text-muted-foreground"> / неделя</span>
                    </div>
                    <ul className="space-y-3 mb-6">
                      <li className="flex items-start gap-2">
                        <Icon name="Check" size={20} className="text-primary mt-0.5" />
                        <span className="text-sm">Всё из плана "Флирт"</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Icon name="Check" size={20} className="text-primary mt-0.5" />
                        <span className="text-sm">🔥 Возможность попросить фото</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Icon name="Check" size={20} className="text-primary mt-0.5" />
                        <span className="text-sm">❤️  Безлимитные сообщения</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Icon name="Check" size={20} className="text-primary mt-0.5" />
                        <span className="text-sm">👍 NSWF без ограничений</span>
                      </li>
                    </ul>
                    <Button 
                      className="w-full" 
                      size="lg" 
                      variant="secondary"
                      onClick={() => handleSubscribe('intimate', 1490)}
                      disabled={isProcessingPayment || !agreedToTerms}
                    >
                      {isProcessingPayment ? 'Обработка...' : 'Оформить подписку'}
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
                    <div className={`bg-card p-4 rounded-lg transition-colors ${agreedToTerms ? 'cursor-pointer hover:bg-muted/50' : 'opacity-50 cursor-not-allowed'}`} onClick={() => agreedToTerms && handleSubscribe('one_girl', 399)}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Одна девушка на 24 часа</span>
                        <Badge>399₽</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Режим интим с одной девушкой на выбор ровно на сутки</p>
                    </div>
                    <div className={`bg-card p-4 rounded-lg transition-colors ${agreedToTerms ? 'cursor-pointer hover:bg-muted/50' : 'opacity-50 cursor-not-allowed'}`} onClick={() => agreedToTerms && handleSubscribe('all_girls', 799)}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Все девушки на 1 день</span>
                        <Badge>799₽</Badge>
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
    </div>
  );
};

export default Index;