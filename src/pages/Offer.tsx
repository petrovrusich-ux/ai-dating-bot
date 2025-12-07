import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { useEffect } from "react";
import { updatePageMeta } from "@/utils/seo";

const Offer = () => {
  const navigate = useNavigate();

  useEffect(() => {
    updatePageMeta(
      "Публичная оферта — AI Romance",
      "Публичная оферта сервиса AI Romance. Условия использования сервиса и договор оферты.",
      "публичная оферта, условия использования, договор, правила сервиса"
    );
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <Icon name="ArrowLeft" size={20} className="mr-2" />
          Назад
        </Button>

        <div className="bg-card rounded-lg p-6 md:p-8 shadow-lg">
          <h1 className="text-3xl font-bold mb-6" itemProp="headline">Публичная оферта</h1>
          
          <div className="space-y-6 text-card-foreground">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Общие положения</h2>
              <p className="text-muted-foreground leading-relaxed">
                Настоящая публичная оферта (далее - "Оферта") является официальным предложением оказать услуги по предоставлению доступа к развлекательному контенту на сайте. Акцептом настоящей Оферты является совершение пользователем действий по оплате услуг.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Предмет договора</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Исполнитель предоставляет Пользователю доступ к развлекательному контенту в виде текстовых сообщений на определенный период времени в зависимости от выбранного тарифного плана:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong>Флирт</strong> - 490₽ за 7 дней, до 50 сообщений в день</li>
                <li><strong>Интим</strong> - 1490₽ за 7 дней, безлимитное общение</li>
                <li><strong>Одна девушка</strong> - 399₽ за 24 часа с одним персонажем</li>
                <li><strong>Все девушки</strong> - 799₽ за 24 часа со всеми персонажами</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Порядок оплаты</h2>
              <p className="text-muted-foreground leading-relaxed">
                Оплата услуг производится через платежную систему ЮKassa. Все платежи являются разовыми и не продлеваются автоматически. Для продления доступа необходимо совершить новую оплату.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Права и обязанности сторон</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <div>
                  <strong className="text-card-foreground">Исполнитель обязуется:</strong>
                  <ul className="list-disc list-inside mt-2 ml-4 space-y-1">
                    <li>Предоставить доступ к услугам сразу после подтверждения оплаты</li>
                    <li>Обеспечить работоспособность сервиса в течение оплаченного периода</li>
                    <li>Обрабатывать персональные данные в соответствии с законодательством РФ</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-card-foreground">Пользователь обязуется:</strong>
                  <ul className="list-disc list-inside mt-2 ml-4 space-y-1">
                    <li>Использовать сервис в соответствии с его назначением</li>
                    <li>Не нарушать права третьих лиц</li>
                    <li>Своевременно оплачивать услуги</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Возврат средств</h2>
              <p className="text-muted-foreground leading-relaxed">
                В связи с мгновенным предоставлением цифровых услуг, возврат денежных средств не производится после активации доступа. Возврат возможен только в случае технической невозможности предоставления услуги со стороны Исполнителя.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Ответственность</h2>
              <p className="text-muted-foreground leading-relaxed">Исполнитель не несет ответственности за: 
- Временные технические сбои, не зависящие от него. 
- Содержание диалогов, созданных AI.  
- Использование бота в целях, противоречащих законодательству РФ.
- Любые последствия, возникшие в результате использования сервиса.
Весь контент предоставляется "как есть" в развлекательных целях. Сервис предназначен только для лиц старше 18 лет.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Персональные данные</h2>
              <p className="text-muted-foreground leading-relaxed">
                Пользователь соглашается на обработку предоставленных персональных данных (Telegram ID, имя пользователя) в целях предоставления услуг. Исполнитель обязуется не передавать данные третьим лицам, за исключением случаев, предусмотренных законодательством РФ.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Прочие условия</h2>
              <p className="text-muted-foreground leading-relaxed">
                Исполнитель оставляет за собой право изменять условия настоящей Оферты в одностороннем порядке с уведомлением Пользователей. Все споры разрешаются путем переговоров, а при невозможности достижения согласия - в судебном порядке по месту нахождения Исполнителя.
              </p>
            </section>

            <section className="pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Дата публикации: {new Date().toLocaleDateString('ru-RU')}
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Offer;