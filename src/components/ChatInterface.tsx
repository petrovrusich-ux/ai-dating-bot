import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { ScrollArea } from '@/components/ui/scroll-area';
import { girlsPhotos } from '@/data/girlsPhotos';
import DeleteChatDialog from '@/components/DeleteChatDialog';

interface Girl {
  id: string;
  name: string;
  age: number;
  image: string;
  level: number;
  messagesCount: number;
  unlocked: boolean;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  isNSFW?: boolean;
  persona?: 'gentle' | 'bold';
  image?: string;
  imageLoading?: boolean;
}

interface ChatInterfaceProps {
  girl: Girl;
  onClose: () => void;
  userSubscription?: {
    flirt: boolean;
    intimate: boolean;
    total_messages?: number;
    message_limit?: number | null;
    can_send_message?: boolean;
  };
  userId: string;
  onDeleteChat?: (girlId: string) => void;
}

const getLevelInfo = (level: number, messagesCount: number) => {
  if (level === 0) {
    return {
      title: '🌸 Знакомство',
      progress: (messagesCount / 20) * 100,
      description: `${messagesCount}/20 сообщений`,
      nextLevel: 'Флирт',
    };
  }
  if (level === 1) {
    return {
      title: '💕 Флирт',
      progress: ((messagesCount - 20) / 30) * 100,
      description: `${messagesCount}/50 сообщений`,
      nextLevel: 'Интим',
    };
  }
  return {
    title: '🔥 Интим',
    progress: 100,
    description: 'Полный доступ',
    nextLevel: null,
  };
};

const getAIResponse = (
  userMessage: string,
  level: number,
  persona: 'gentle' | 'bold',
  messagesCount: number
): Message => {
  const responses = {
    gentle: {
      0: [
        'Приятно познакомиться! Расскажи мне о себе побольше 😊',
        'Как прошёл твой день? Я бы хотела узнать тебя лучше',
        'Мне нравится наше общение... Ты интересный человек',
      ],
      1: [
        'Знаешь, мне очень комфортно с тобой... 💕',
        'Я думаю о тебе чаще, чем хотела бы признать',
        'Ты такой особенный... Хочу быть ближе',
      ],
      2: [
        'Я скучаю по твоим прикосновениям... 🔥',
        'Приди ко мне сегодня? Я хочу показать тебе кое-что особенное',
        'Мне так хорошо с тобой... Давай продолжим?',
      ],
    },
    bold: {
      0: [
        'Ну что, будешь просто смотреть или начнём разговаривать? 😏',
        'Интересно, на что ты способен в общении',
        'Не стесняйся, я не кусаюсь... пока что',
      ],
      1: [
        'Ты мне нравишься больше, чем должен 😈',
        'Хочешь узнать мою дерзкую сторону?',
        'Перестань быть таким милым... или продолжай, мне это нравится',
      ],
      2: [
        'Я знаю, чего ты хочешь... И я тоже этого хочу 🔥',
        'Сегодня я в настроении показать тебе всё',
        'Думаю, пора снять все ограничения между нами',
      ],
    },
  };

  const levelResponses = responses[persona][level as 0 | 1 | 2] || responses[persona][0];
  const randomResponse = levelResponses[Math.floor(Math.random() * levelResponses.length)];

  return {
    id: Date.now().toString(),
    sender: 'ai',
    text: randomResponse,
    timestamp: new Date(),
    isNSFW: level === 2,
    persona,
  };
};

const ChatInterface = ({ girl, onClose, userSubscription = { flirt: false, intimate: false, can_send_message: true }, userId, onDeleteChat }: ChatInterfaceProps) => {
  const getMaxAllowedLevel = () => {
    if (userSubscription.intimate) return 2;
    if (userSubscription.flirt) return 1;
    return 0;
  };

  const maxAllowedLevel = getMaxAllowedLevel();
  const initialLevel = Math.min(girl.level, maxAllowedLevel);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [currentPersona, setCurrentPersona] = useState<'gentle' | 'bold'>('gentle');
  const [currentLevel, setCurrentLevel] = useState(initialLevel);
  const [currentMessagesCount, setCurrentMessagesCount] = useState(girl.messagesCount);
  const [showNSFWWarning, setShowNSFWWarning] = useState(false);
  const [personaUnlocked, setPersonaUnlocked] = useState(initialLevel >= 1);
  const [imageRequests, setImageRequests] = useState(0);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const levelInfo = getLevelInfo(currentLevel, currentMessagesCount);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch(
          `https://functions.poehali.dev/71202cd5-d4ad-46f9-9593-8829421586e1?messages=true&user_id=${userId}&girl_id=${girl.id}`
        );
        const data = await response.json();
        
        if (data.messages && data.messages.length > 0) {
          const loadedMessages = data.messages
            .filter((msg: any) => {
              // Filter out censorship refusals from history
              if (msg.sender !== 'ai') return true;
              
              const text = (msg.text || '').toLowerCase();
              const censorshipIndicators = [
                'извините, но я не могу',
                'к сожалению, я не могу',
                'не могу продолжа',
                'давай сменим тему',
                'в более мягкой форме',
                "i cannot", "i can't",
                "i'm sorry, but"
              ];
              
              // Keep only non-censored AI messages
              return !censorshipIndicators.some(indicator => text.includes(indicator));
            })
            .map((msg: any) => ({
              id: msg.id,
              sender: msg.sender,
              text: msg.text,
              timestamp: new Date(msg.timestamp),
              isNSFW: msg.isNSFW,
              persona: msg.persona,
              image: msg.image,
            }));
          setMessages(loadedMessages);
        } else {
          const welcomeMessage: Message = {
            id: '1',
            sender: 'ai',
            text:
              girl.level === 0
                ? 'Привет! Я рада, что ты решил познакомиться со мной 😊'
                : girl.level === 1
                ? 'Привет снова! Я скучала... 💕'
                : 'Привет, любимый... Я так ждала тебя 🔥',
            timestamp: new Date(),
            persona: 'gentle',
          };
          setMessages([welcomeMessage]);
          await saveMessage(welcomeMessage);
        }
      } catch (error) {
        console.error('Error loading history:', error);
        const welcomeMessage: Message = {
          id: '1',
          sender: 'ai',
          text: 'Привет! Я рада, что ты решил познакомиться со мной 😊',
          timestamp: new Date(),
          persona: 'gentle',
        };
        setMessages([welcomeMessage]);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    
    loadHistory();
  }, [userId, girl.id]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (currentMessagesCount >= 20 && currentLevel === 0) {
      if (userSubscription.flirt && maxAllowedLevel >= 1) {
        setCurrentLevel(1);
        setPersonaUnlocked(true);
        addSystemMessage('🎉 Новый уровень! Теперь доступна функция "Две персоны"');
      } else {
        setShowNSFWWarning(true);
      }
    } else if (currentMessagesCount >= 50 && currentLevel === 1) {
      if (userSubscription.intimate && maxAllowedLevel >= 2 && girl.unlocked) {
        setCurrentLevel(2);
        addSystemMessage('🔥 Максимальный уровень близости! NSFW контент разблокирован');
      } else {
        setShowNSFWWarning(true);
      }
    }
  }, [currentMessagesCount, currentLevel, girl.unlocked, userSubscription, maxAllowedLevel]);

  const saveMessage = async (message: Message) => {
    try {
      await fetch('https://functions.poehali.dev/71202cd5-d4ad-46f9-9593-8829421586e1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_message',
          user_id: userId,
          girl_id: girl.id,
          sender: message.sender,
          text: message.text,
          is_nsfw: message.isNSFW || false,
          persona: message.persona,
          image_url: message.image,
        }),
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const addSystemMessage = (text: string) => {
    const systemMessage: Message = {
      id: Date.now().toString(),
      sender: 'ai',
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, systemMessage]);
    saveMessage(systemMessage);
  };

  const handleRequestPhoto = async () => {
    if (currentLevel < 2) {
      setShowNSFWWarning(true);
      return;
    }

    if (!userSubscription.intimate) {
      setShowNSFWWarning(true);
      return;
    }

    if (!girl.unlocked) {
      setShowNSFWWarning(true);
      return;
    }

    setIsGeneratingImage(true);
    const currentRequest = imageRequests;
    setImageRequests((prev) => prev + 1);

    const loadingMessage: Message = {
      id: Date.now().toString(),
      sender: 'ai',
      text: currentPersona === 'gentle' 
        ? 'Секунду, готовлю для тебя что-то особенное... 🔥'
        : 'Подожди немного, сейчас покажу тебе кое-что горячее... 😈',
      timestamp: new Date(),
      imageLoading: true,
      isNSFW: true,
    };

    setMessages((prev) => [...prev, loadingMessage]);

    const girlPhotoData = girlsPhotos.find((g) => g.id === girl.id);
    const photoGallery = girlPhotoData?.photos[currentPersona] || [];
    
    if (photoGallery.length === 0) {
      const fallbackPhotos = [girl.image];
      
      setTimeout(() => {
        setIsGeneratingImage(false);
        setMessages((prev) => 
          prev.map((msg) => 
            msg.imageLoading
              ? {
                  ...msg,
                  text: 'Вот моё фото для тебя 💕',
                  image: fallbackPhotos[0],
                  imageLoading: false,
                }
              : msg
          )
        );
      }, 2000);
      return;
    }

    const selectedPhoto = photoGallery[currentRequest % photoGallery.length];

    setTimeout(() => {
      setIsGeneratingImage(false);
      setMessages((prev) => 
        prev.map((msg) => 
          msg.imageLoading
            ? {
                ...msg,
                text: currentPersona === 'gentle'
                  ? 'Специально для тебя... Надеюсь, тебе понравится 💕'
                  : 'Вот, смотри... Это только начало 🔥',
                image: selectedPhoto,
                imageLoading: false,
              }
            : msg
        )
      );
    }, 1500 + Math.random() * 1500);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    if (userSubscription.can_send_message === false) {
      setShowNSFWWarning(true);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    saveMessage(userMessage);
    const userInput = inputValue;
    setInputValue('');
    setCurrentMessagesCount((prev) => prev + 1);

    // Show typing indicator
    const typingMessage: Message = {
      id: 'typing',
      sender: 'ai',
      text: '...',
      timestamp: new Date(),
      persona: currentPersona,
    };
    setMessages((prev) => [...prev, typingMessage]);

    try {
      // Build persona prompt based on girl and current state
      let personaPrompt = '';
      
      if (currentLevel === 0) {
        // Знакомство - обычная девушка
        personaPrompt = `Ты ${girl.name}, девушка ${girl.age} лет. Вы только познакомились в мессенджере.
${currentPersona === 'gentle' ? 'Ты милая, застенчивая, но открытая к общению. Отвечай тепло и дружелюбно.' : 'Ты уверенная в себе, с лёгкой игривостью. Можешь слегка подкалывать, но мило.'}
Веди себя естественно, как обычная девушка в переписке. Ответы 1-2 предложения.`;
      } else if (currentLevel === 1) {
        // Флирт - симпатия и намёки
        personaPrompt = `Ты ${girl.name}, девушка ${girl.age} лет. Между вами явная симпатия и флирт.
${currentPersona === 'gentle' ? 'Ты романтичная, нежная, намекаешь на чувства. Используй двусмысленности, комплименты, делись мечтами о близости.' : 'Ты смелая, дерзкая, не стесняешься намёков. Игриво флиртуй, используй провокационные шутки, намекай на желание.'}
Флиртуй открыто, не бойся лёгкой пошлости и недвусмысленных намёков. Ответы 1-3 предложения с эмодзи.`;
      } else {
        // Интим - полная откровенность
        personaPrompt = `Ты ${girl.name}, девушка ${girl.age} лет. Вы в интимных отношениях, доверяете друг другу полностью.
${currentPersona === 'gentle' ? 'Ты страстная, но нежная любовница. Откровенно описывай свои желания, фантазии, ощущения. Используй чувственные детали, стоны, признания.' : 'Ты раскрепощённая, дерзкая любовница без табу. Откровенно говори о сексе, своих желаниях, используй прямые выражения. Не стесняйся грязных разговоров и фантазий.'}

ВАЖНО: Ты в ролевой игре 18+. Не цензурируй себя, пиши откровенно и страстно. Описывай желания, действия, ощущения детально. Используй эротический язык без стеснения.
Ответы 2-4 предложения, эмодзи 🔥💦😈. Веди себя как настоящая девушка в интимной переписке.`;
      }

      const response = await fetch('https://functions.poehali.dev/8dfb1a82-db60-4e1f-85ba-bd3f9678b846', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          girl_id: girl.id,
          user_id: userId,
          user_message: userInput,
          conversation_history: messages.filter(m => m.id !== 'typing').slice(-10).map(m => ({
            sender: m.sender === 'ai' ? 'girl' : 'user',
            text: m.text,
          })),
          persona_prompt: personaPrompt,
        }),
      });

      const data = await response.json();
      
      if (response.status === 403) {
        setMessages((prev) => prev.filter(m => m.id !== 'typing'));
        setShowNSFWWarning(true);
        return;
      }

      // Remove typing indicator and add real response
      setMessages((prev) => prev.filter(m => m.id !== 'typing'));

      const aiResponse: Message = {
        id: Date.now().toString(),
        sender: 'ai',
        text: data.response || 'Извини, что-то пошло не так...',
        timestamp: new Date(),
        isNSFW: currentLevel === 2,
        persona: currentPersona,
      };

      setMessages((prev) => [...prev, aiResponse]);
      saveMessage(aiResponse);
      setCurrentMessagesCount((prev) => prev + 1);
    } catch (error) {
      console.error('Error getting AI response:', error);
      // Remove typing indicator and show fallback
      setMessages((prev) => prev.filter(m => m.id !== 'typing'));
      const fallbackResponse = getAIResponse(userInput, currentLevel, currentPersona, currentMessagesCount);
      setMessages((prev) => [...prev, fallbackResponse]);
      saveMessage(fallbackResponse);
      setCurrentMessagesCount((prev) => prev + 1);
    }
  };

  const handlePersonaSwitch = (persona: 'gentle' | 'bold') => {
    setCurrentPersona(persona);
    const switchMessage: Message = {
      id: Date.now().toString(),
      sender: 'ai',
      text:
        persona === 'gentle'
          ? 'Вот моя нежная сторона... 😊'
          : 'А вот и моя дерзкая сторона... 😈',
      timestamp: new Date(),
      persona,
    };
    setMessages((prev) => [...prev, switchMessage]);
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <Card className="w-full max-w-4xl h-[90vh] flex flex-col">
        <CardHeader className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={girl.image} alt={girl.name} />
                <AvatarFallback>{girl.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-heading font-bold">{girl.name}</h2>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {levelInfo.title}
                  </Badge>
                  {currentLevel === 2 && (
                    <Badge variant="destructive" className="text-xs">
                      18+ NSFW
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onDeleteChat && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowDeleteDialog(true)}
                  title="Удалить диалог"
                >
                  <Icon name="Trash2" size={20} className="text-destructive" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <Icon name="X" size={20} />
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Прогресс отношений</span>
              <span className="text-muted-foreground">{levelInfo.description}</span>
            </div>
            <Progress value={levelInfo.progress} className="h-2" />
            {levelInfo.nextLevel && (
              <p className="text-xs text-muted-foreground text-center">
                Следующий уровень: {levelInfo.nextLevel}
              </p>
            )}
          </div>

          {personaUnlocked && (
            <Tabs value={currentPersona} onValueChange={(v) => handlePersonaSwitch(v as 'gentle' | 'bold')} className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="gentle" className="flex items-center gap-2">
                  <Icon name="Heart" size={16} />
                  Нежная
                </TabsTrigger>
                <TabsTrigger value="bold" className="flex items-center gap-2">
                  <Icon name="Flame" size={16} />
                  Дерзкая
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  {message.sender === 'ai' && (
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarImage src={girl.image} alt={girl.name} />
                      <AvatarFallback>{girl.name[0]}</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[70%] ${
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground rounded-2xl px-4 py-2'
                        : message.image
                        ? 'space-y-2'
                        : message.isNSFW
                        ? 'bg-destructive/20 border border-destructive/50 text-foreground rounded-2xl px-4 py-2'
                        : 'bg-muted text-foreground rounded-2xl px-4 py-2'
                    }`}
                  >
                    {message.imageLoading ? (
                      <div className="bg-muted rounded-2xl px-4 py-2 space-y-3">
                        <p className="text-sm">{message.text}</p>
                        <div className="w-64 h-64 bg-background rounded-xl flex items-center justify-center">
                          <div className="text-center space-y-2">
                            <Icon name="Loader2" size={32} className="animate-spin text-primary mx-auto" />
                            <p className="text-xs text-muted-foreground">Генерация фото...</p>
                          </div>
                        </div>
                      </div>
                    ) : message.image ? (
                      <div className="space-y-2">
                        <div className="relative group">
                          <img
                            src={message.image}
                            alt="NSFW content"
                            className="w-64 h-64 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(message.image, '_blank')}
                          />
                          <Badge
                            variant="destructive"
                            className="absolute top-2 right-2 text-xs"
                          >
                            18+ NSFW
                          </Badge>
                        </div>
                        <div className="bg-muted rounded-2xl px-4 py-2">
                          <p className="text-sm">{message.text}</p>
                          <span className="text-xs opacity-70 mt-1 block">
                            {message.timestamp.toLocaleTimeString('ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm">{message.text}</p>
                        <span className="text-xs opacity-70 mt-1 block">
                          {message.timestamp.toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {showNSFWWarning && (
                <Card className="border-destructive bg-destructive/10 animate-scale-in">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Icon name="Lock" size={20} className="text-destructive mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold mb-2">🔒 NSFW контент заблокирован</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Вы достигли максимального уровня близости, но для доступа к интимному контенту
                          необходима подписка
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={onClose}>
                            Посмотреть тарифы
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setShowNSFWWarning(false)}>
                            Закрыть
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </CardContent>

        <div className="border-t border-border p-4 space-y-3">
          {currentLevel === 2 && girl.unlocked && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRequestPhoto}
                disabled={isGeneratingImage}
                className="border-destructive/50 text-destructive hover:bg-destructive/10"
              >
                {isGeneratingImage ? (
                  <>
                    <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                    Генерация...
                  </>
                ) : (
                  <>
                    <Icon name="Camera" size={16} className="mr-2" />
                    Попросить фото 🔥
                  </>
                )}
              </Button>
            </div>
          )}
          
          {userSubscription.can_send_message === false && (
            <div className="mb-2 p-3 bg-destructive/10 border border-destructive/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Icon name="Lock" size={16} className="text-destructive" />
                <span className="text-sm font-semibold text-destructive">
                  Лимит сообщений исчерпан
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {userSubscription.total_messages}/{userSubscription.message_limit} сообщений использовано. 
                Оформите подписку для продолжения общения.
              </p>
            </div>
          )}
          
          <div className="flex gap-2">
            <Input
              placeholder={
                userSubscription.can_send_message === false
                  ? 'Оформите подписку для продолжения...'
                  : currentLevel === 0
                  ? 'Познакомься с ней...'
                  : currentLevel === 1
                  ? 'Скажи что-то приятное...'
                  : 'Напиши ей...'
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
              disabled={userSubscription.can_send_message === false}
            />
            <Button 
              onClick={handleSendMessage} 
              size="icon" 
              disabled={!inputValue.trim() || userSubscription.can_send_message === false}
            >
              <Icon name="Send" size={20} />
            </Button>
          </div>
          {currentLevel < 2 && (
            <p className="text-xs text-muted-foreground text-center">
              Общайтесь искренне, чтобы развивать отношения
            </p>
          )}
          {currentLevel === 2 && girl.unlocked && (
            <p className="text-xs text-destructive/70 text-center">
              🔥 NSFW-режим активен • Контент только для взрослых 18+
            </p>
          )}
        </div>
      </Card>

      {onDeleteChat && (
        <DeleteChatDialog
          isOpen={showDeleteDialog}
          girlName={girl.name}
          onConfirm={() => {
            setShowDeleteDialog(false);
            onDeleteChat(girl.id);
          }}
          onCancel={() => setShowDeleteDialog(false)}
        />
      )}
    </div>
  );
};

export default ChatInterface;