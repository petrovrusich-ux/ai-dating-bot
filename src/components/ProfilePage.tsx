import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { useNavigate } from "react-router-dom";

interface ProfilePageProps {
  userData: any;
  onLogout: () => void;
}

const ProfilePage = ({ userData, onLogout }: ProfilePageProps) => {
  const navigate = useNavigate();
  
  const subscription = userData?.subscription || {};
  const subscriptionType = subscription.subscription_type || 'free';
  const endDate = subscription.end_date ? new Date(subscription.end_date).toLocaleDateString('ru-RU') : 'Не указана';
  
  const getSubscriptionBadge = () => {
    switch (subscriptionType) {
      case 'premium':
        return <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 px-4 py-1 text-sm font-semibold shadow-lg">✨ Premium</Badge>;
      case 'pro':
        return <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 px-4 py-1 text-sm font-semibold shadow-lg">⚡ Pro</Badge>;
      default:
        return <Badge variant="secondary" className="px-4 py-1">Free</Badge>;
    }
  };

  const getInitials = () => {
    const name = userData?.name || 'User';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative max-w-4xl mx-auto py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 hover:bg-card/50 backdrop-blur-sm transition-all"
        >
          <Icon name="ArrowLeft" size={20} className="mr-2" />
          Назад
        </Button>

        {/* Hero Profile Card */}
        <Card className="mb-6 overflow-hidden border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl animate-scale-in">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
          <CardHeader className="relative pb-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-accent rounded-full blur-xl opacity-75 group-hover:opacity-100 transition-opacity animate-pulse-glow" />
                <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center text-white text-3xl font-bold shadow-2xl ring-4 ring-background/50">
                  {getInitials()}
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <CardTitle className="text-3xl font-heading bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-2">
                  {userData?.name || 'Пользователь'}
                </CardTitle>
                <CardDescription className="text-base">{userData?.email}</CardDescription>
              </div>
              <div>
                {getSubscriptionBadge()}
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border border-border/50">
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">ID пользователя</p>
                <p className="font-mono text-sm font-semibold">{userData?.user_id}</p>
              </div>
              
              <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm border border-border/50">
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Подписка до</p>
                <p className="font-semibold">{endDate}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Card */}
        <Card className="mb-6 border-border/50 bg-card/80 backdrop-blur-xl shadow-xl animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="Sparkles" size={24} className="text-primary" />
              Доступные функции
            </CardTitle>
            <CardDescription>Ваши текущие возможности в приложении</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="group relative overflow-hidden p-4 rounded-xl bg-gradient-to-r from-pink-500/10 to-red-500/10 border border-pink-500/20 hover:border-pink-500/40 transition-all hover:shadow-lg hover:shadow-pink-500/20">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-pink-500/5 to-pink-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center">
                      <Icon name="Heart" size={20} className="text-white" />
                    </div>
                    <span className="font-semibold">Флирт режим</span>
                  </div>
                  {subscription.flirt ? (
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">✓ Активен</Badge>
                  ) : (
                    <Badge variant="outline" className="opacity-50">Недоступен</Badge>
                  )}
                </div>
              </div>

              <div className="group relative overflow-hidden p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 hover:border-red-500/40 transition-all hover:shadow-lg hover:shadow-red-500/20">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/5 to-red-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-orange-600 flex items-center justify-center">
                      <Icon name="Flame" size={20} className="text-white" />
                    </div>
                    <span className="font-semibold">Интим режим</span>
                  </div>
                  {subscription.intimate ? (
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">✓ Активен</Badge>
                  ) : (
                    <Badge variant="outline" className="opacity-50">Недоступен</Badge>
                  )}
                </div>
              </div>

              <div className="group relative overflow-hidden p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 hover:border-yellow-500/40 transition-all hover:shadow-lg hover:shadow-yellow-500/20">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/5 to-yellow-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center">
                      <Icon name="Crown" size={20} className="text-white" />
                    </div>
                    <span className="font-semibold">Premium функции</span>
                  </div>
                  {subscription.premium ? (
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">✓ Активны</Badge>
                  ) : (
                    <Badge variant="outline" className="opacity-50">Недоступны</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Card */}
        <Card className="mb-6 border-border/50 bg-card/80 backdrop-blur-xl shadow-xl animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="Settings" size={24} className="text-primary" />
              Настройки аккаунта
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start group hover:bg-primary/10 hover:border-primary/50 transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                <Icon name="CreditCard" size={18} className="text-white" />
              </div>
              Управление подпиской
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start group hover:bg-primary/10 hover:border-primary/50 transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                <Icon name="Settings" size={18} className="text-white" />
              </div>
              Настройки
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start group hover:bg-destructive/10 hover:border-destructive/50 transition-all text-destructive"
              onClick={onLogout}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-destructive to-red-600 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                <Icon name="LogOut" size={18} className="text-white" />
              </div>
              Выйти из аккаунта
            </Button>
          </CardContent>
        </Card>

        {/* Contacts Card */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-xl animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="MessageCircle" size={24} className="text-primary" />
              Контакты
            </CardTitle>
            <CardDescription>Информация о сервисе и поддержке</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <a href="mailto:1ilyapetrov@vk.com" className="group p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon name="Mail" size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Почта</p>
                    <p className="text-sm font-semibold group-hover:text-primary transition-colors">1ilyapetrov@vk.com</p>
                  </div>
                </div>
              </a>

              <a href="https://t.me/petrovboxing" target="_blank" rel="noopener noreferrer" className="group p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon name="MessageCircle" size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Telegram</p>
                    <p className="text-sm font-semibold group-hover:text-primary transition-colors">@petrovboxing</p>
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
                    <p className="text-sm font-semibold">58383948854</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50">
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Реквизиты</p>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold">ИП Петров Илья Дмитриевич</p>
                <p className="text-sm text-muted-foreground font-mono">ИНН: 616809818160</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;