/**
 * <picture> nativo - o próprio navegador escolhe a fonte certa ANTES de
 * baixar a imagem (não é troca via JS depois de carregar a errada), então
 * funciona em Server Components sem precisar de "use client". Sem
 * mobileUrl, cai de volta pro comportamento de sempre (uma imagem só).
 */
export function ResponsiveBanner({
  desktopUrl,
  mobileUrl,
  className,
  alt = "",
}: {
  desktopUrl: string;
  mobileUrl?: string | null;
  className?: string;
  alt?: string;
}) {
  if (!mobileUrl) {
    return <img src={desktopUrl} alt={alt} className={className} />;
  }
  return (
    <picture>
      <source media="(max-width: 640px)" srcSet={mobileUrl} />
      <img src={desktopUrl} alt={alt} className={className} />
    </picture>
  );
}
