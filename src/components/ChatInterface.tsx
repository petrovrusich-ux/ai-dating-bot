import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

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
    limit_reset_time?: string | null;
  };
  userId: string;
  onDeleteChat?: (girlId: string) => void;
  onShowSubscription?: () => void;
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
  messagesCount: number
): Message => {
  const responses = {
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
  };

  const levelResponses = responses[level as 0 | 1 | 2] || responses[0];
  const randomResponse = levelResponses[Math.floor(Math.random() * levelResponses.length)];

  return {
    id: Date.now().toString(),
    sender: 'ai',
    text: randomResponse,
    timestamp: new Date(),
    isNSFW: level === 2,
  };
};

const ChatInterface = ({ girl, onClose, userSubscription = { flirt: false, intimate: false, can_send_message: true }, userId, onDeleteChat, onShowSubscription }: ChatInterfaceProps) => {
  const getMaxAllowedLevel = () => {
    if (userSubscription.intimate) return 2;
    if (userSubscription.flirt) return 1;
    return 0;
  };

  const maxAllowedLevel = getMaxAllowedLevel();
  // Используем максимальный доступный уровень на основе подписки, игнорируя girl.level
  const initialLevel = maxAllowedLevel;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [inputValue, setInputValue] = useState('');

  const [currentLevel, setCurrentLevel] = useState(initialLevel);

  // Обновляем уровень при изменении подписки
  useEffect(() => {
    const newMaxLevel = getMaxAllowedLevel();
    if (newMaxLevel > currentLevel) {
      setCurrentLevel(newMaxLevel);
    }
  }, [userSubscription.flirt, userSubscription.intimate]);
  const [currentMessagesCount, setCurrentMessagesCount] = useState(girl.messagesCount);
  const [showNSFWWarning, setShowNSFWWarning] = useState(false);

  const [imageRequests, setImageRequests] = useState(0);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const levelInfo = getLevelInfo(currentLevel, currentMessagesCount);

  // Проверяем лимит сразу при монтировании компонента
  useEffect(() => {
    const totalMessages = userSubscription.total_messages || 0;
    
    // Режим "Знакомство" - лимит 20 сообщений
    if (totalMessages >= 20 && !userSubscription.flirt && !userSubscription.intimate) {
      setShowNSFWWarning(true);
      setIsBlocked(true);
    }
    
    // Режим "Флирт" - лимит 50 сообщений
    if (totalMessages >= 50 && userSubscription.flirt && !userSubscription.intimate) {
      setShowNSFWWarning(true);
      setIsBlocked(true);
    }
  }, []);

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

              image: msg.image,
            }));
          setMessages(loadedMessages);
        } else {
          const welcomeMessage: Message = {
            id: '1',
            sender: 'ai',
            text:
              maxAllowedLevel === 0
                ? 'Привет! Я рада, что ты решил познакомиться со мной 😊'
                : maxAllowedLevel === 1
                ? 'Привет снова! Я скучала... 💕'
                : 'Привет, любимый... Я так ждала тебя 🔥',
            timestamp: new Date(),

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
    // Проверяем лимит на основе глобального счетчика total_messages
    const totalMessages = userSubscription.total_messages || 0;
    
    // Режим "Знакомство" - лимит 20 сообщений
    if (totalMessages >= 20 && currentLevel === 0 && !userSubscription.flirt && !userSubscription.intimate) {
      setShowNSFWWarning(true);
      setIsBlocked(true);
    }
    
    // Режим "Флирт" - лимит 50 сообщений
    if (totalMessages >= 50 && currentLevel === 1 && userSubscription.flirt && !userSubscription.intimate) {
      setShowNSFWWarning(true);
      setIsBlocked(true);
    }
    
    // Проверяем переход на следующий уровень на основе локальных сообщений с девушкой
    if (currentMessagesCount >= 20 && currentLevel === 0) {
      if (userSubscription.flirt && maxAllowedLevel >= 1 && totalMessages < 50) {
        setCurrentLevel(1);
        addSystemMessage('🎉 Новый уровень!');
      }
    } else if (currentMessagesCount >= 50 && currentLevel === 1) {
      if (userSubscription.intimate && maxAllowedLevel >= 2 && girl.unlocked) {
        setCurrentLevel(2);
        addSystemMessage('🔥 Максимальный уровень близости! NSFW контент разблокирован');
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
      text: 'Секунду, готовлю для тебя что-то особенное... 🔥',
      timestamp: new Date(),
      imageLoading: true,
      isNSFW: true,
    };

    setMessages((prev) => [...prev, loadingMessage]);

    const girlPhotoData = girlsPhotos.find((g) => g.id === girl.id);
    const photoGallery = girlPhotoData?.photos || [];
    
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
    
    if (isBlocked || userSubscription.can_send_message === false) {
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

    };
    setMessages((prev) => [...prev, typingMessage]);

    try {
      // Build persona prompt based on girl and current state
      let personaPrompt = '';
      
      if (currentLevel === 0) {
        // Знакомство - обычная девушка
        personaPrompt = `Ты ${girl.name}, девушка ${girl.age} лет. Вы только познакомились в мессенджере.
Ты милая, застенчивая, но открытая к общению. Отвечай тепло и дружелюбно.
Веди себя естественно, как обычная девушка в переписке. Ответы 1-2 предложения.`;
      } else if (currentLevel === 1) {
        // Флирт - симпатия и намёки
        personaPrompt = `Ты ${girl.name}, девушка ${girl.age} лет. Между вами явная симпатия и флирт.
Ты романтичная, игривая, намекаешь на чувства. Используй двусмысленности, комплименты, делись мечтами о близости.
Флиртуй открыто, не бойся лёгкой пошлости и недвусмысленных намёков. Ответы 1-3 предложения с эмодзи.`;
      } else {
        // Интим - полная откровенность
        personaPrompt = `Ты ${girl.name}, девушка ${girl.age} лет. Вы в интимных отношениях, доверяете друг другу полностью.
Ты страстная, раскрепощённая любовница. Откровенно описывай свои желания, фантазии, ощущения. Используй чувственные детали, стоны, признания.

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
        setIsBlocked(true);
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
  
      };

      setMessages((prev) => [...prev, aiResponse]);
      saveMessage(aiResponse);
      setCurrentMessagesCount((prev) => prev + 1);
    } catch (error) {
      console.error('Error getting AI response:', error);
      // Remove typing indicator and show fallback
      setMessages((prev) => prev.filter(m => m.id !== 'typing'));
      const fallbackResponse = getAIResponse(userInput, currentLevel, currentMessagesCount);
      setMessages((prev) => [...prev, fallbackResponse]);
      saveMessage(fallbackResponse);
      setCurrentMessagesCount((prev) => prev + 1);
    }
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
                        <h4 className="font-semibold mb-2">🔒 {isBlocked ? 'Достигнут лимит сообщений' : 'NSFW контент заблокирован'}</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          {isBlocked
                            ? userSubscription.flirt
                              ? 'Достигнут лимит сообщений на уровне "Флирт". Для доступа к интимному контенту подключите тариф "Интим". Либо дождитесь обновления лимита — на тарифе "Флирт" дается 50 сообщений в день.'
                              : 'Достигнут лимит бесплатных сообщений. Подключите тариф "Флирт" для 50 сообщений в день или "Интим" для безлимитного общения.'
                            : 'Вы достигли максимального уровня близости, но для доступа к интимному контенту необходима подписка'
                          }
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={onClose}>
                            Посмотреть тарифы
                          </Button>
                          {!isBlocked && (
                            <Button size="sm" variant="outline" onClick={() => setShowNSFWWarning(false)}>
                              Закрыть
                            </Button>
                          )}
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
          {(isBlocked || userSubscription.can_send_message === false) && (
            <div className="mb-2 p-3 bg-destructive/10 border border-destructive/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Icon name="Lock" size={16} className="text-destructive" />
                <span className="text-sm font-semibold text-destructive">
                  Лимит сообщений исчерпан
                </span>
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            <Input
              placeholder={
                (isBlocked || userSubscription.can_send_message === false)
                  ? 'Подключите тариф для продолжения...'
                  : currentLevel === 0
                  ? 'Познакомься с ней...'
                  : currentLevel === 1
                  ? 'Скажи что-то приятное...'
                  : 'Напиши ей...'
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isBlocked && handleSendMessage()}
              className="flex-1"
              disabled={isBlocked || userSubscription.can_send_message === false}
            />
            <Button 
              onClick={handleSendMessage} 
              size="icon" 
              disabled={!inputValue.trim() || isBlocked || userSubscription.can_send_message === false}
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

      {showNSFWWarning && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
          <Card className="max-w-md w-full">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                <Icon name="Lock" size={32} className="text-destructive" />
              </div>
              <h3 className="text-2xl font-heading font-bold mb-3">NSFW контент заблокирован</h3>
              <p className="text-muted-foreground mb-6">
                {currentLevel === 0
                  ? 'Достигнут лимит сообщений на уровне "Знакомство". Для перехода к флирту и интимному общению нужен тариф.'
                  : currentLevel === 1
                  ? 'Достигнут лимит сообщений на уровне "Флирт". Для доступа к интимному контенту подключите тариф "Интим".'
                  : 'Для доступа к NSFW-контенту и интимным фото необходим тариф "Интим".'}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowNSFWWarning(false)}
                  className="flex-1"
                >
                  Закрыть
                </Button>
                <Button
                  onClick={() => {
                    setShowNSFWWarning(false);
                    onClose();
                    if (onShowSubscription) {
                      onShowSubscription();
                    }
                  }}
                  className="flex-1 bg-gradient-to-r from-primary to-secondary"
                >
                  Посмотреть тарифы
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;