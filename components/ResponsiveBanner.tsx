"use client";

import { useEffect, useState } from "react";

/**
 * Escolhe a imagem certa checando a largura real da janela em JS, em vez
 * de depender do <picture>/<source media="..."> nativo do navegador - que
 * na prática estava escolhendo a versão errada mesmo em telas grandes.
 * No primeiro render (servidor + antes do JS rodar no cliente) sempre
 * mostra a desktop, pra nunca piscar a mobile errada numa tela grande;
 * troca pra mobile assim que o JS confirma que a janela é estreita.
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!mobileUrl) return;
    function check() {
      setIsMobile(window.innerWidth <= 640);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [mobileUrl]);

  const src = isMobile && mobileUrl ? mobileUrl : desktopUrl;
  return <img src={src} alt={alt} className={className} />;
}
