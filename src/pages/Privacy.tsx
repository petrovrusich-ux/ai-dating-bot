import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

const Privacy = () => {
  const navigate = useNavigate();

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
          <h1 className="text-3xl font-bold mb-6">Политика конфиденциальности</h1>
          
          <div className="space-y-6 text-card-foreground">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Общие положения</h2>
              <p className="text-muted-foreground leading-relaxed">
                Настоящая Политика конфиденциальности определяет порядок обработки и защиты персональных данных пользователей сервиса. Мы уважаем вашу конфиденциальность и обязуемся защищать предоставленную вами информацию в соответствии с законодательством РФ о персональных данных (152-ФЗ).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Собираемые данные</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Для предоставления услуг мы собираем следующие категории персональных данных:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong>Идентификационные данные:</strong> Telegram ID, имя пользователя Telegram</li>
                <li><strong>Платежная информация:</strong> данные о транзакциях через платежную систему ЮKassa</li>
                <li><strong>Данные использования сервиса:</strong> история сообщений, выбранные тарифы, статистика активности</li>
                <li><strong>Технические данные:</strong> IP-адрес, тип устройства, данные о браузере (собираются автоматически)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Цели обработки данных</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>Мы обрабатываем ваши персональные данные исключительно для следующих целей:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Предоставление доступа к развлекательному контенту</li>
                  <li>Обработка платежей и управление подписками</li>
                  <li>Персонализация контента и улучшение качества сервиса</li>
                  <li>Техническая поддержка пользователей</li>
                  <li>Соблюдение требований законодательства РФ</li>
                  <li>Предотвращение мошенничества и злоупотреблений</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Правовые основания обработки</h2>
              <p className="text-muted-foreground leading-relaxed">
                Обработка персональных данных осуществляется на основании вашего согласия, полученного при регистрации и использовании сервиса, а также для исполнения договора (публичной оферты) между вами и исполнителем услуг.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Передача данных третьим лицам</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>Мы не продаем и не передаем ваши персональные данные третьим лицам, за исключением следующих случаев:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>Платежная система ЮKassa</strong> - для обработки платежей (в минимальном необходимом объеме)</li>
                  <li><strong>Облачные сервисы</strong> - для хранения данных и обеспечения работы сервиса (с соблюдением мер безопасности)</li>
                  <li><strong>По требованию закона</strong> - в случае законных запросов государственных органов РФ</li>
                </ul>
                <p className="mt-3">
                  Все третьи лица, получающие доступ к вашим данным, обязаны соблюдать конфиденциальность и использовать данные только в указанных целях.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Хранение и защита данных</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>Мы применяем следующие меры для защиты ваших персональных данных:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Шифрование данных при передаче (SSL/TLS)</li>
                  <li>Ограничение доступа к данным только уполномоченным сотрудникам</li>
                  <li>Регулярное резервное копирование</li>
                  <li>Защита от несанкционированного доступа</li>
                </ul>
                <p className="mt-3">
                  Данные хранятся в течение срока действия вашей учетной записи и 3 лет после прекращения использования сервиса (для соблюдения требований законодательства).
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Ваши права</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>В соответствии с законодательством РФ вы имеете право:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Получать информацию об обработке ваших персональных данных</li>
                  <li>Требовать уточнения, блокирования или удаления неверных данных</li>
                  <li>Отозвать согласие на обработку персональных данных</li>
                  <li>Обжаловать действия оператора в Роскомнадзоре или суде</li>
                  <li>Получить копию ваших персональных данных</li>
                </ul>
                <p className="mt-3">
                  Для реализации своих прав свяжитесь с нами через контактную форму в сервисе.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Cookies и технологии отслеживания</h2>
              <p className="text-muted-foreground leading-relaxed">
                Мы используем cookies и аналогичные технологии для улучшения работы сервиса, анализа использования и персонализации контента. Вы можете отключить cookies в настройках браузера, однако это может ограничить функциональность сервиса.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Изменения в политике</h2>
              <p className="text-muted-foreground leading-relaxed">
                Мы оставляем за собой право вносить изменения в настоящую Политику конфиденциальности. О существенных изменениях мы уведомим вас через интерфейс сервиса. Продолжение использования сервиса после внесения изменений означает ваше согласие с обновленной политикой.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Контактная информация</h2>
              <div className="text-muted-foreground leading-relaxed space-y-2">
                <p>Оператор персональных данных:</p>
                <p className="font-medium text-card-foreground">Петров Илья Дмитриевич</p>
                <p>ИНН: 616809818160</p>
                <p className="mt-3">
                  По всем вопросам, связанным с обработкой персональных данных, вы можете обратиться через форму обратной связи в сервисе.
                </p>
              </div>
            </section>

            <section className="pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Дата публикации: {new Date().toLocaleDateString('ru-RU')}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Последнее обновление: {new Date().toLocaleDateString('ru-RU')}
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;