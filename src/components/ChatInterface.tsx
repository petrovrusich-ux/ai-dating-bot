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
  };
  userId: string;
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

const ChatInterface = ({ girl, onClose, userSubscription = { flirt: false, intimate: false }, userId }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [currentPersona, setCurrentPersona] = useState<'gentle' | 'bold'>('gentle');
  const [currentLevel, setCurrentLevel] = useState(girl.level);
  const [currentMessagesCount, setCurrentMessagesCount] = useState(girl.messagesCount);
  const [showNSFWWarning, setShowNSFWWarning] = useState(false);
  const [personaUnlocked, setPersonaUnlocked] = useState(girl.level >= 1);
  const [imageRequests, setImageRequests] = useState(0);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const levelInfo = getLevelInfo(currentLevel, currentMessagesCount);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch(
          `https://functions.poehali.dev/c5dd3fbc-79a7-467a-9817-5405d79b8d67?user_id=${userId}&girl_id=${girl.id}`
        );
        const data = await response.json();
        
        if (data.messages && data.messages.length > 0) {
          const loadedMessages = data.messages.map((msg: any) => ({
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
      if (userSubscription.flirt) {
        setCurrentLevel(1);
        setPersonaUnlocked(true);
        addSystemMessage('🎉 Новый уровень! Теперь доступна функция "Две персоны"');
      } else {
        setShowNSFWWarning(true);
      }
    } else if (currentMessagesCount >= 50 && currentLevel === 1) {
      if (userSubscription.intimate && girl.unlocked) {
        setCurrentLevel(2);
        addSystemMessage('🔥 Максимальный уровень близости! NSFW контент разблокирован');
      } else {
        setShowNSFWWarning(true);
      }
    }
  }, [currentMessagesCount, currentLevel, girl.unlocked, userSubscription]);

  const saveMessage = async (message: Message) => {
    try {
      await fetch('https://functions.poehali.dev/c5dd3fbc-79a7-467a-9817-5405d79b8d67', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    saveMessage(userMessage);
    setInputValue('');
    setCurrentMessagesCount((prev) => prev + 1);

    setTimeout(() => {
      const aiResponse = getAIResponse(inputValue, currentLevel, currentPersona, currentMessagesCount);
      setMessages((prev) => [...prev, aiResponse]);
      saveMessage(aiResponse);
      setCurrentMessagesCount((prev) => prev + 1);
    }, 1000 + Math.random() * 2000);
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
            <Button variant="ghost" size="icon" onClick={onClose}>
              <Icon name="X" size={20} />
            </Button>
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
          
          <div className="flex gap-2">
            <Input
              placeholder={
                currentLevel === 0
                  ? 'Познакомься с ней...'
                  : currentLevel === 1
                  ? 'Скажи что-то приятное...'
                  : 'Напиши ей...'
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} size="icon" disabled={!inputValue.trim()}>
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
    </div>
  );
};

export default ChatInterface;