import sharp from "sharp";

/**
 * Fotos de celular (comprovantes, prints) costumam vir com 3-8MB, mas pra
 * visualização numa fila de aprovação ou card, isso é desperdício - reduz
 * pro tamanho real necessário antes de subir. Corta tanto o armazenamento
 * quanto (principalmente) a transferência toda vez que a imagem é
 * carregada, sem precisar trocar de provedor.
 *
 * Mantém a proporção original, nunca aumenta uma imagem menor que o
 * limite, e sempre reencoda como JPEG (mais previsível/leve que manter o
 * formato original, mesmo pra PNGs de print de tela que não precisam de
 * transparência real nesse contexto).
 */
export async function compressImage(
  buffer: Buffer,
  { maxWidth = 1600, quality = 78 }: { maxWidth?: number; quality?: number } = {}
): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
  const output = await sharp(buffer)
    .rotate() // aplica a orientação EXIF antes de redimensionar, evita foto "deitada"
    .resize({ width: maxWidth, withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();

  return { buffer: output, contentType: "image/jpeg", extension: "jpg" };
}
