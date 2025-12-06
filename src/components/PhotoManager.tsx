import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { girlsPhotos, GirlPhotoGallery } from '@/data/girlsPhotos';

const PhotoManager = () => {
  const [photos, setPhotos] = useState<GirlPhotoGallery[]>(girlsPhotos);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  const addPhoto = (girlId: string, url: string) => {
    if (!url.trim()) return;

    setPhotos((prev) =>
      prev.map((girl) =>
        girl.id === girlId
          ? {
              ...girl,
              photos: [...girl.photos, url],
            }
          : girl
      )
    );
    setNewPhotoUrl('');
  };

  const removePhoto = (girlId: string, index: number) => {
    setPhotos((prev) =>
      prev.map((girl) =>
        girl.id === girlId
          ? {
              ...girl,
              photos: girl.photos.filter((_, i) => i !== index),
            }
          : girl
      )
    );
  };

  const copyDataToClipboard = () => {
    const dataStr = JSON.stringify(photos, null, 2);
    navigator.clipboard.writeText(dataStr);
    alert('Данные скопированы! Вставьте их в src/data/girlsPhotos.ts');
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-heading font-bold mb-2">Управление фото девушек</h1>
            <p className="text-muted-foreground">
              Добавьте фото для каждой девушки. Они будут отправляться по порядку.
            </p>
          </div>
          <Button onClick={copyDataToClipboard} variant="outline">
            <Icon name="Copy" size={18} className="mr-2" />
            Скопировать данные
          </Button>
        </div>

        <div className="space-y-6">
          {photos.map((girl) => (
            <Card key={girl.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span>{girl.name}</span>
                  <Badge variant="secondary">
                    {girl.photos.length} фото
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {girl.photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo}
                        alt={`${girl.name} - фото ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removePhoto(girl.id, index)}
                      >
                        <Icon name="Trash2" size={16} />
                      </Button>
                      <Badge className="absolute bottom-2 left-2">#{index + 1}</Badge>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Вставьте URL изображения..."
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addPhoto(girl.id, newPhotoUrl);
                      }
                    }}
                  />
                  <Button onClick={() => addPhoto(girl.id, newPhotoUrl)}>
                    <Icon name="Plus" size={18} className="mr-2" />
                    Добавить
                  </Button>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    💡 <strong>Как загрузить фото:</strong>
                  </p>
                  <ol className="text-sm text-muted-foreground space-y-1 ml-4 list-decimal">
                    <li>Загрузите изображение на любой хостинг (Imgur, imgbb.com и т.д.)</li>
                    <li>Скопируйте прямую ссылку на изображение</li>
                    <li>Вставьте URL в поле выше и нажмите "Добавить"</li>
                    <li>После добавления всех фото нажмите "Скопировать данные" сверху</li>
                    <li>Вставьте данные в файл src/data/girlsPhotos.ts</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8 bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Icon name="Info" size={24} className="text-primary mt-1" />
              <div>
                <h3 className="font-semibold mb-2">Как это работает?</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Фото отправляются по очереди при запросе пользователя</li>
                  <li>• После последнего фото список начинается сначала</li>
                  <li>• Порядок фото соответствует порядку добавления</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PhotoManager;
